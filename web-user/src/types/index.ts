export type Role = 'bidder' | 'tech_lead' | 'legal' | 'bid_director' | 'admin';
export type ProjectStatus = 'draft' | 'in_progress' | 'awaiting_approval' | 'approved' | 'archived' | 'rejected';
export type StorageType = 'residential' | 'commercial' | 'utility' | 'ems_battery';
export type FileType = 'announcement' | 'our_bid' | 'competitor_bid';
export type AgentName = 'parse_announcement' | 'parse_document' | 'quality_check' | 'requirement_coverage' | 'bid_compare' | 'competitor_match';
export type AgentStatus = 'pending' | 'running' | 'success' | 'failed';
export type IssueCategory = 'self_check' | 'requirement_gap' | 'bid_gap';
export type Severity = 'red' | 'yellow' | 'green';

export interface User { id: string; name: string; role: Role; department?: string; }
export interface Project { id: string; name: string; bidder?: string; deadline?: string; region?: string; storage_type?: StorageType; capacity_mwh?: number; power_mw?: number; duration_h?: number; description?: string; status: ProjectStatus; creator_id: string; created_at: string; updated_at?: string; }
export interface FileRecord { id: string; project_id: string; version_no: number; file_type: FileType; original_name: string; storage_url: string; file_size: number; created_at: string; }
export interface AgentRun { id: string; project_id: string; version_no: number; agent_name: AgentName; status: AgentStatus; error_message?: string; started_at?: string; finished_at?: string; duration_ms?: number; }
export interface Issue { id: string; project_id: string; version_no: number; category: IssueCategory; severity: Severity; field_key?: string; field_label?: string; our_value?: string; opponent_value?: string; gap_description?: string; suggestion?: string; source_agent?: string; is_resolved: number; created_at: string; }
export interface Recommendation { id: string; source_entry_id: string; source_file_id?: string; company_name: string; match_score: number; match_features_json?: string; recommendation_reason?: string; status: 'recommended' | 'adopted' | 'dismissed'; }
export interface CoverageItem { req_item: string; category: string; our_status: 'covered' | 'missing' | 'not_met'; evidence?: string; }
export interface OpponentParam { file_id: string; company_name: string; params: Record<string, unknown>; }
export interface Results { version_no: number | null; opponents: { file_id: string; company_name: string }[]; self_check: Issue[]; coverage: CoverageItem[]; bid_gaps: Issue[]; param_compare: { fields: string[]; our: Record<string, unknown>; opponents: OpponentParam[] }; }
export interface LibraryEntry { id: string; company_name?: string; industry_domain?: string; project_scale?: string; project_type?: string; index_status: string; file_id: string; }
