import { field, variant, vec } from "@dao-xyz/borsh";
import { v4 as uuid } from "uuid";
import { TaskStatus } from "../types";

// --- Interfaces for Abstraction ---

export interface IDatabase {
    address: string;
    type: 'peerbit' | 'local';
    tasks: {
        index: {
            search: (query: any) => Promise<any[]>;
        };
        put: (task: any) => Promise<void>;
        del: (id: string) => Promise<void>;
        events?: {
            addEventListener: (event: string, cb: () => void) => void;
        };
    };
}

// --- Data Models ---

@variant(0) 
export class Task {
    @field({ type: "string" })
    id: string;

    @field({ type: "string" })
    title: string;

    @field({ type: "string" })
    description: string;

    @field({ type: "string" })
    status: string;

    @field({ type: "u64" })
    createdAt: bigint;

    @field({ type: vec("string") })
    tags: string[];

    constructor(title: string, status: string = TaskStatus.INBOX) {
        this.id = uuid();
        this.title = title;
        this.description = "";
        this.status = status;
        this.createdAt = BigInt(Date.now());
        this.tags = [];
    }
}

// --- Local Storage Mock Implementation ---

class MockDatabase implements IDatabase {
    address = "local-mode-" + uuid().slice(0, 6);
    type: 'local' = 'local';
    
    private getTasks() {
        try {
            const data = localStorage.getItem('peer_gtd_local_data');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    private saveTasks(tasks: any[]) {
        localStorage.setItem('peer_gtd_local_data', JSON.stringify(tasks));
    }
    
    tasks = {
        index: {
            search: async (query: any) => {
                const tasks = this.getTasks();
                // Map plain JSON back to Task-like objects expected by UI
                return tasks.map((t: any) => ({
                    ...t,
                    // Safety check: ensure createdAt is convertible to BigInt
                    createdAt: BigInt(t.createdAt || Date.now()) 
                }));
            }
        },
        put: async (task: Task) => {
            let tasks = this.getTasks();
            const plainTask = {
                ...task,
                // Store as string in JSON because BigInt is not JSON serializable
                createdAt: task.createdAt.toString() 
            };
            
            const existingIndex = tasks.findIndex((t: any) => t.id === task.id);
            if (existingIndex >= 0) {
                tasks[existingIndex] = plainTask;
            } else {
                tasks.push(plainTask);
            }
            this.saveTasks(tasks);
        },
        del: async (id: string) => {
            let tasks = this.getTasks();
            tasks = tasks.filter((t: any) => t.id !== id);
            this.saveTasks(tasks);
        },
        events: {
            addEventListener: (event: string, cb: () => void) => {
                window.addEventListener('storage', (e) => {
                    if (e.key === 'peer_gtd_local_data') cb();
                });
            }
        }
    };
}

// --- Service ---

class PeerbitService {
    private _db: IDatabase | null = null;

    async init(): Promise<{ db: IDatabase }> {
        if (this._db) return { db: this._db };

        console.log("Initializing Service...");

        // Create a timeout promise that rejects after 5 seconds to give CDN more time, but still fail safe
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 5000)
        );

        const loadPeerbit = async () => {
            // Using esm.sh bundle for better reliability with module resolution
            // We include ?bundle to fix transitive dependency issues (like readDoubleLE in protobufjs)
            const [PeerbitPkg, ProgramPkg, DocPkg] = await Promise.all([
                import("https://esm.sh/peerbit@5.6.1?bundle"),
                import("https://esm.sh/@peerbit/program@5.6.1?bundle"),
                import("https://esm.sh/@peerbit/document@5.6.1?bundle")
            ]);
            return { PeerbitPkg, ProgramPkg, DocPkg };
        };

        try {
            // Race the loading against the timeout
            const { PeerbitPkg, ProgramPkg, DocPkg } = await Promise.race([loadPeerbit(), timeout]) as any;

            const { Peerbit } = PeerbitPkg;
            const { Program } = ProgramPkg;
            const { Documents } = DocPkg;

            console.log("Peerbit loaded via CDN.");

            // Define Database Class dynamically
            @variant("peer_gtd_db_v1")
            class GTDDatabase extends Program {
                @field({ type: Documents })
                tasks: any;

                constructor() {
                    super();
                    this.tasks = new Documents();
                }

                async open() {
                    await this.tasks.open({
                        type: Task,
                        index: { key: "id" }
                    });
                }
            }

            const peer = await Peerbit.create();
            console.log("Peer ID:", peer.identity.publicKey.toString());

            let db: GTDDatabase;
            const storedAddress = localStorage.getItem("peerbit_db_address");

            if (storedAddress) {
                try {
                    db = await peer.open(storedAddress);
                } catch {
                    db = await peer.open(new GTDDatabase());
                }
            } else {
                db = await peer.open(new GTDDatabase());
            }

            if (db.address) {
                localStorage.setItem("peerbit_db_address", db.address.toString());
            }

            this._db = {
                address: db.address.toString(),
                type: 'peerbit',
                tasks: {
                    index: {
                        search: async (q) => db.tasks.index.search(q, { local: true, remote: true })
                    },
                    put: async (t) => db.tasks.put(t),
                    del: async (id) => db.tasks.del(id),
                    events: db.tasks.events
                }
            };
            
        } catch (error) {
            console.warn("P2P Load Failed or Timed Out. Falling back to Local Mode.", error);
            this._db = new MockDatabase();
        }

        return { db: this._db! };
    }

    get address() {
        return this._db?.address;
    }
}

export const peerbitService = new PeerbitService();