export type Role = 'bidder' | 'tech_lead' | 'legal' | 'bid_director' | 'admin';
export interface User { id: string; name: string; role: Role; department?: string; created_at?: string; }
export interface AdminDashboard { project_total: number; agent_run_total: number; agent_success_rate: number; storage_used_bytes: number; }
