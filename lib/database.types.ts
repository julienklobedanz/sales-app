export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_reads: {
        Row: {
          alert_id: string | null
          id: string
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_reads_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "high_impact_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          created_at: string | null
          id: string
          reference_id: string
          requester_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reference_id: string
          requester_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reference_id?: string
          requester_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          action_details: Json
          entity_id: string | null
          id: string
          org_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          action_details?: Json
          entity_id?: string | null
          id?: string
          org_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          action_details?: Json
          entity_id?: string | null
          id?: string
          org_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_status: string | null
          account_status_source: string | null
          brandfetch_synced_at: string | null
          created_at: string | null
          crm_account_id: string | null
          crm_provider: string | null
          description: string | null
          employee_count: number | null
          entity_kind: string
          headquarters: string | null
          id: string
          industry: string | null
          internal_reference_approval_contact_id: string | null
          is_favorite: boolean | null
          linked_account_id: string | null
          logo_url: string | null
          name: string
          newsroom_discovered_at: string | null
          newsroom_urls: string[] | null
          organization_id: string | null
          partner_category: string | null
          salesforce_account_id: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          account_status?: string | null
          account_status_source?: string | null
          brandfetch_synced_at?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          crm_provider?: string | null
          description?: string | null
          employee_count?: number | null
          entity_kind?: string
          headquarters?: string | null
          id?: string
          industry?: string | null
          internal_reference_approval_contact_id?: string | null
          is_favorite?: boolean | null
          linked_account_id?: string | null
          logo_url?: string | null
          name: string
          newsroom_discovered_at?: string | null
          newsroom_urls?: string[] | null
          organization_id?: string | null
          partner_category?: string | null
          salesforce_account_id?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          account_status?: string | null
          account_status_source?: string | null
          brandfetch_synced_at?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          crm_provider?: string | null
          description?: string | null
          employee_count?: number | null
          entity_kind?: string
          headquarters?: string | null
          id?: string
          industry?: string | null
          internal_reference_approval_contact_id?: string | null
          is_favorite?: boolean | null
          linked_account_id?: string | null
          logo_url?: string | null
          name?: string
          newsroom_discovered_at?: string | null
          newsroom_urls?: string[] | null
          organization_id?: string | null
          partner_category?: string | null
          salesforce_account_id?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_internal_reference_approval_contact_id_fkey"
            columns: ["internal_reference_approval_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_cache: {
        Row: {
          company_id: string
          id: string
          last_used_at: string
          name: string
          organization_id: string
        }
        Insert: {
          company_id: string
          id?: string
          last_used_at?: string
          name: string
          organization_id: string
        }
        Update: {
          company_id?: string
          id?: string
          last_used_at?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_cache_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_roadmap_projects: {
        Row: {
          company_id: string
          created_at: string | null
          estimated_value: string | null
          id: string
          project_name: string
          status: string | null
          tags: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          estimated_value?: string | null
          id?: string
          project_name: string
          status?: string | null
          tags?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          estimated_value?: string | null
          id?: string
          project_name?: string
          status?: string | null
          tags?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_roadmap_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_strategies: {
        Row: {
          company_id: string | null
          competitive_situation: string | null
          id: string
          main_goals: string | null
          metrics_pain: string | null
          mh_assessment: Json
          next_steps: string | null
          red_flags: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          competitive_situation?: string | null
          id?: string
          main_goals?: string | null
          metrics_pain?: string | null
          mh_assessment?: Json
          next_steps?: string | null
          red_flags?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          competitive_situation?: string | null
          id?: string
          main_goals?: string | null
          metrics_pain?: string | null
          mh_assessment?: Json
          next_steps?: string | null
          red_flags?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_strategies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_persons: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_interaction_at: string | null
          last_name: string | null
          linkedin_url: string | null
          organization_id: string | null
          phone: string | null
          position: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_persons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_persons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_desk_bid_team: {
        Row: {
          created_at: string
          email: string | null
          id: string
          organization_id: string
          profile_id: string | null
          project_id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          organization_id: string
          profile_id?: string | null
          project_id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          organization_id?: string
          profile_id?: string | null
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_desk_bid_team_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_desk_bid_team_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_desk_bid_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "deal_desk_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_desk_documents: {
        Row: {
          created_at: string
          extract_status: string
          file_name: string
          id: string
          mime_type: string | null
          organization_id: string
          project_id: string
          size_bytes: number | null
          sort_order: number
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          extract_status?: string
          file_name: string
          id?: string
          mime_type?: string | null
          organization_id: string
          project_id: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          extract_status?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          project_id?: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_desk_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_desk_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "deal_desk_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_desk_projects: {
        Row: {
          analysis_snapshot: Json | null
          analysis_source: string | null
          analysis_status: string
          archived_at: string | null
          bid_decision: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          deal_id: string | null
          error_message: string | null
          id: string
          organization_id: string
          project_name: string
          updated_at: string
          win_probability: number | null
        }
        Insert: {
          analysis_snapshot?: Json | null
          analysis_source?: string | null
          analysis_status?: string
          archived_at?: string | null
          bid_decision?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          deal_id?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          project_name?: string
          updated_at?: string
          win_probability?: number | null
        }
        Update: {
          analysis_snapshot?: Json | null
          analysis_source?: string | null
          analysis_status?: string
          archived_at?: string | null
          bid_decision?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          deal_id?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          project_name?: string
          updated_at?: string
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_desk_projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_desk_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_desk_red_flags: {
        Row: {
          created_at: string
          flag_key: string | null
          id: string
          label: string
          organization_id: string
          project_id: string
          sent_to_legal: boolean
          severity: string | null
          status: string
        }
        Insert: {
          created_at?: string
          flag_key?: string | null
          id?: string
          label: string
          organization_id: string
          project_id: string
          sent_to_legal?: boolean
          severity?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          flag_key?: string | null
          id?: string
          label?: string
          organization_id?: string
          project_id?: string
          sent_to_legal?: boolean
          severity?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_desk_red_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_desk_red_flags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "deal_desk_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_desk_sme_routes: {
        Row: {
          assignee_profile_id: string | null
          created_at: string
          id: string
          organization_id: string
          project_id: string
          requirement_key: string
          status: string
          updated_at: string
        }
        Insert: {
          assignee_profile_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          project_id: string
          requirement_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_profile_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          project_id?: string
          requirement_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_desk_sme_routes_assignee_profile_id_fkey"
            columns: ["assignee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_desk_sme_routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_desk_sme_routes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "deal_desk_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_reference_requests: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string
          id: string
          message: string
          organization_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id: string
          id?: string
          message: string
          organization_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string
          id?: string
          message?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_reference_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_reference_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_references: {
        Row: {
          deal_id: string
          reference_id: string
          similarity_score: number | null
        }
        Insert: {
          deal_id: string
          reference_id: string
          similarity_score?: number | null
        }
        Update: {
          deal_id?: string
          reference_id?: string
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_references_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_references_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_deadlines: {
        Row: {
          id: string
          deal_id: string
          organization_id: string
          kind: Database["public"]["Enums"]["deal_deadline_kind"]
          label: string
          due_at: string | null
          due_text: string | null
          is_approximate: boolean
          source: Database["public"]["Enums"]["deal_deadline_source"]
          source_key: string
          suppressed_at: string | null
          pinned: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          organization_id: string
          kind?: Database["public"]["Enums"]["deal_deadline_kind"]
          label: string
          due_at?: string | null
          due_text?: string | null
          is_approximate?: boolean
          source: Database["public"]["Enums"]["deal_deadline_source"]
          source_key: string
          suppressed_at?: string | null
          pinned?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          organization_id?: string
          kind?: Database["public"]["Enums"]["deal_deadline_kind"]
          label?: string
          due_at?: string | null
          due_text?: string | null
          is_approximate?: boolean
          source?: Database["public"]["Enums"]["deal_deadline_source"]
          source_key?: string
          suppressed_at?: string | null
          pinned?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_deadlines_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_deadlines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_documents: {
        Row: {
          id: string
          deal_id: string
          organization_id: string
          file_name: string
          kind: Database["public"]["Enums"]["deal_document_kind"]
          storage_path: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          organization_id: string
          file_name: string
          kind?: Database["public"]["Enums"]["deal_document_kind"]
          storage_path: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          organization_id?: string
          file_name?: string
          kind?: Database["public"]["Enums"]["deal_document_kind"]
          storage_path?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_rfp_analyses: {
        Row: {
          coverage_report: Json | null
          created_at: string
          deal_id: string
          error_message: string | null
          extracted_requirements: Json
          id: string
          organization_id: string
          source_file_name: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          coverage_report?: Json | null
          created_at?: string
          deal_id: string
          error_message?: string | null
          extracted_requirements?: Json
          id?: string
          organization_id: string
          source_file_name?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          coverage_report?: Json | null
          created_at?: string
          deal_id?: string
          error_message?: string | null
          extracted_requirements?: Json
          id?: string
          organization_id?: string
          source_file_name?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_rfp_analyses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfp_analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_manager_id: string | null
          company_id: string | null
          created_at: string | null
          crm_opportunity_id: string | null
          crm_source: string | null
          crm_stage: string | null
          crm_synced_at: string | null
          contract_end_date: string | null
          expiry_date: string | null
          id: string
          incumbent_provider: string | null
          industry: string | null
          is_public: boolean
          is_rfp_mode: boolean
          organization_id: string
          requirements_text: string | null
          sales_manager_id: string | null
          salesforce_opportunity_id: string | null
          status: string
          title: string
          updated_at: string | null
          volume: string | null
        }
        Insert: {
          account_manager_id?: string | null
          company_id?: string | null
          created_at?: string | null
          crm_opportunity_id?: string | null
          crm_source?: string | null
          crm_stage?: string | null
          crm_synced_at?: string | null
          contract_end_date?: string | null
          expiry_date?: string | null
          id?: string
          incumbent_provider?: string | null
          industry?: string | null
          is_public?: boolean
          is_rfp_mode?: boolean
          organization_id: string
          requirements_text?: string | null
          sales_manager_id?: string | null
          salesforce_opportunity_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
          volume?: string | null
        }
        Update: {
          account_manager_id?: string | null
          company_id?: string | null
          created_at?: string | null
          crm_opportunity_id?: string | null
          crm_source?: string | null
          crm_stage?: string | null
          crm_synced_at?: string | null
          contract_end_date?: string | null
          expiry_date?: string | null
          id?: string
          incumbent_provider?: string | null
          industry?: string | null
          is_public?: boolean
          is_rfp_mode?: boolean
          organization_id?: string
          requirements_text?: string | null
          sales_manager_id?: string | null
          salesforce_opportunity_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_events: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string | null
          event_type: string
          id: string
          organization_id: string
          payload: Json
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_events_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_briefings: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          executive_name: string
          id: string
          linkedin_url: string | null
          organization_id: string | null
          priorities: Json | null
          red_flags: Json | null
          summary: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          executive_name: string
          id?: string
          linkedin_url?: string | null
          organization_id?: string | null
          priorities?: Json | null
          red_flags?: Json | null
          summary?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          executive_name?: string
          id?: string
          linkedin_url?: string | null
          organization_id?: string | null
          priorities?: Json | null
          red_flags?: Json | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_briefings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_briefings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_contacts: {
        Row: {
          buying_center_role: string | null
          company_id: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_interaction_at: string | null
          last_name: string
          organization_id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          buying_center_role?: string | null
          company_id: string
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_interaction_at?: string | null
          last_name: string
          organization_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          buying_center_role?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_interaction_at?: string | null
          last_name?: string
          organization_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          reference_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reference_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reference_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      high_impact_alerts: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_global: boolean | null
          organization_id: string | null
          source_url: string | null
          title: string
          type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_global?: boolean | null
          organization_id?: string | null
          source_url?: string | null
          title: string
          type: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_global?: boolean | null
          organization_id?: string | null
          source_url?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "high_impact_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "high_impact_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          role: string | null
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      market_signal_account_news: {
        Row: {
          body: string
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          id: string
          ingest_source: string | null
          insight_signal_fact: string | null
          insight_why_now: string | null
          published_on: string
          segment: string
          signal_category: string | null
          source_label: string | null
          source_url: string | null
        }
        Insert: {
          body: string
          company_id: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ingest_source?: string | null
          insight_signal_fact?: string | null
          insight_why_now?: string | null
          published_on?: string
          segment: string
          signal_category?: string | null
          source_label?: string | null
          source_url?: string | null
        }
        Update: {
          body?: string
          company_id?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ingest_source?: string | null
          insight_signal_fact?: string | null
          insight_why_now?: string | null
          published_on?: string
          segment?: string
          signal_category?: string | null
          source_label?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_signal_account_news_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      market_signal_champion_watchlist: {
        Row: {
          company_name: string | null
          created_at: string
          is_active: boolean
          person_key: string
          person_name: string
          person_title: string | null
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          is_active?: boolean
          person_key: string
          person_name: string
          person_title?: string | null
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          is_active?: boolean
          person_key?: string
          person_name?: string
          person_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_signal_executive_events: {
        Row: {
          change_summary: string
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          detected_at: string
          event_kind: string
          id: string
          insight_signal_fact: string | null
          insight_why_now: string | null
          person_name: string
          person_title_after: string | null
          person_title_before: string | null
          signal_category: string | null
          source_url: string | null
        }
        Insert: {
          change_summary: string
          company_id: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          detected_at?: string
          event_kind?: string
          id?: string
          insight_signal_fact?: string | null
          insight_why_now?: string | null
          person_name: string
          person_title_after?: string | null
          person_title_before?: string | null
          signal_category?: string | null
          source_url?: string | null
        }
        Update: {
          change_summary?: string
          company_id?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          detected_at?: string
          event_kind?: string
          id?: string
          insight_signal_fact?: string | null
          insight_why_now?: string | null
          person_name?: string
          person_title_after?: string | null
          person_title_before?: string | null
          signal_category?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_signal_executive_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nda_agreements: {
        Row: {
          company_id: string
          created_at: string
          document_version: string | null
          file_name: string | null
          file_storage_path: string | null
          id: string
          notes: string | null
          organization_id: string
          signed_at: string | null
          status: string
          title: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_version?: string | null
          file_name?: string | null
          file_storage_path?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          signed_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_version?: string | null
          file_name?: string | null
          file_storage_path?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          signed_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nda_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nda_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_inbox_reads: {
        Row: {
          notification_key: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_key: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_key?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          evidence_event_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          evidence_event_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          evidence_event_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_evidence_event_id_fkey"
            columns: ["evidence_event_id"]
            isOneToOne: false
            referencedRelation: "evidence_events"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_compliance_document_types: {
        Row: {
          created_at: string
          id: string
          label: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_compliance_document_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_compliance_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string | null
          file_storage_path: string | null
          id: string
          is_current: boolean
          organization_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name?: string | null
          file_storage_path?: string | null
          id?: string
          is_current?: boolean
          organization_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_storage_path?: string | null
          id?: string
          is_current?: boolean
          organization_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_compliance_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_compliance_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_crm_connections: {
        Row: {
          access_token_enc: string
          connected_by: string | null
          created_at: string
          expires_at: string | null
          external_account_id: string | null
          hubspot_contract_end_property: string | null
          id: string
          last_sync_at: string | null
          organization_id: string
          provider: string
          refresh_token_enc: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token_enc: string
          connected_by?: string | null
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          hubspot_contract_end_property?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id: string
          provider: string
          refresh_token_enc?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_enc?: string
          connected_by?: string | null
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          hubspot_contract_end_property?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          refresh_token_enc?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_crm_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string
          function_role: Database["public"]["Enums"]["function_role"]
          id: string
          invited_by: string
          organization_id: string
          system_role: Database["public"]["Enums"]["system_role"]
          token: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at: string
          function_role?: Database["public"]["Enums"]["function_role"]
          id?: string
          invited_by: string
          organization_id: string
          system_role?: Database["public"]["Enums"]["system_role"]
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string
          function_role?: Database["public"]["Enums"]["function_role"]
          id?: string
          invited_by?: string
          organization_id?: string
          system_role?: Database["public"]["Enums"]["system_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          api_settings: Json
          created_at: string | null
          date_display_format: string
          export_settings: Json
          id: string
          integration_settings: Json
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subdomain: string | null
          subscription_status: string | null
          updated_at: string | null
          workflow_settings: Json
        }
        Insert: {
          api_settings?: Json
          created_at?: string | null
          date_display_format?: string
          export_settings?: Json
          id?: string
          integration_settings?: Json
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          workflow_settings?: Json
        }
        Update: {
          api_settings?: Json
          created_at?: string | null
          date_display_format?: string
          export_settings?: Json
          id?: string
          integration_settings?: Json
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          workflow_settings?: Json
        }
        Relationships: []
      }
      portfolio_unlock_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_hash: string
          slug: string
          was_success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_hash: string
          slug: string
          was_success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_hash?: string
          slug?: string
          was_success?: boolean
        }
        Relationships: []
      }
      portfolio_unlock_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          shared_portfolio_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          shared_portfolio_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          shared_portfolio_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_unlock_tokens_shared_portfolio_id_fkey"
            columns: ["shared_portfolio_id"]
            isOneToOne: false
            referencedRelation: "shared_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          booking_url: string | null
          capabilities: Json
          created_at: string
          full_name: string | null
          function_role: Database["public"]["Enums"]["function_role"]
          id: string
          job_title: string | null
          notification_settings: Json
          organization_id: string | null
          phone: string | null
          system_role: Database["public"]["Enums"]["system_role"]
        }
        Insert: {
          avatar_url?: string | null
          booking_url?: string | null
          capabilities?: Json
          created_at?: string
          full_name?: string | null
          function_role?: Database["public"]["Enums"]["function_role"]
          id: string
          job_title?: string | null
          notification_settings?: Json
          organization_id?: string | null
          phone?: string | null
          system_role?: Database["public"]["Enums"]["system_role"]
        }
        Update: {
          avatar_url?: string | null
          booking_url?: string | null
          capabilities?: Json
          created_at?: string
          full_name?: string | null
          function_role?: Database["public"]["Enums"]["function_role"]
          id?: string
          job_title?: string | null
          notification_settings?: Json
          organization_id?: string | null
          phone?: string | null
          system_role?: Database["public"]["Enums"]["system_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reference_assets: {
        Row: {
          category: string
          created_at: string | null
          file_name: string | null
          file_path: string
          file_type: string | null
          id: string
          reference_id: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          file_name?: string | null
          file_path: string
          file_type?: string | null
          id?: string
          reference_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          file_name?: string | null
          file_path?: string
          file_type?: string | null
          id?: string
          reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_assets_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      references: {
        Row: {
          anonymized_from_id: string | null
          approval_comment: string | null
          approval_competitor_blacklist: string[]
          approval_consent_file_url: string | null
          approval_contact_id: string | null
          approval_coordinator_email: string | null
          approval_coordinator_name: string | null
          approval_customer_facing_name: string | null
          approval_customer_last_sent_at: string | null
          approval_customer_reminder_sent_at: string | null
          approval_delegated_to_email: string | null
          approval_delegated_to_name: string | null
          approval_expires_at: string | null
          approval_external_contact_id: string | null
          approval_grace_until: string | null
          approval_internal_review_comment: string | null
          approval_internal_review_token: string | null
          approval_internal_reviewed_at: string | null
          approval_internal_reviewer_id: string | null
          approval_internal_status: string
          approval_message: string | null
          approval_owner_name: string | null
          approval_quote_approved: string | null
          approval_quote_proposed: string | null
          approval_reference_call_frequency: string | null
          approval_reference_giver_name: string | null
          approval_reference_giver_title: string | null
          approval_reference_status_snapshot: string | null
          approval_requested_at: string | null
          approval_requested_by: string | null
          approval_requester_name: string | null
          approval_responded_at: string | null
          approval_scope_anonymous_mention: boolean
          approval_scope_confidential_sales: boolean
          approval_scope_logo_use: boolean
          approval_scope_named_mention: boolean
          approval_scope_press_release: boolean
          approval_scope_reference_call: boolean
          approval_token: string | null
          company_id: string
          competitors: string | null
          contact_id: string | null
          contract_type: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          customer_approval_status: string | null
          customer_challenge: string | null
          customer_contact: string | null
          customer_contact_id: string | null
          deleted_at: string | null
          embedding: string | null
          embedding_error: string | null
          embedding_updated_at: string | null
          employee_count: number | null
          file_path: string | null
          full_text: string | null
          id: string
          incumbent_provider: string | null
          industry: string | null
          is_nda_deal: boolean
          organization_id: string | null
          original_document_url: string | null
          our_solution: string | null
          project_end: string | null
          project_start: string | null
          project_status: string | null
          status: Database["public"]["Enums"]["reference_status"]
          summary: string | null
          tags: string | null
          title: string
          updated_at: string | null
          volume_eur: string | null
          website: string | null
        }
        Insert: {
          anonymized_from_id?: string | null
          approval_comment?: string | null
          approval_competitor_blacklist?: string[]
          approval_consent_file_url?: string | null
          approval_contact_id?: string | null
          approval_coordinator_email?: string | null
          approval_coordinator_name?: string | null
          approval_customer_facing_name?: string | null
          approval_customer_last_sent_at?: string | null
          approval_customer_reminder_sent_at?: string | null
          approval_delegated_to_email?: string | null
          approval_delegated_to_name?: string | null
          approval_expires_at?: string | null
          approval_external_contact_id?: string | null
          approval_grace_until?: string | null
          approval_internal_review_comment?: string | null
          approval_internal_review_token?: string | null
          approval_internal_reviewed_at?: string | null
          approval_internal_reviewer_id?: string | null
          approval_internal_status?: string
          approval_message?: string | null
          approval_owner_name?: string | null
          approval_quote_approved?: string | null
          approval_quote_proposed?: string | null
          approval_reference_call_frequency?: string | null
          approval_reference_giver_name?: string | null
          approval_reference_giver_title?: string | null
          approval_reference_status_snapshot?: string | null
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approval_requester_name?: string | null
          approval_responded_at?: string | null
          approval_scope_anonymous_mention?: boolean
          approval_scope_confidential_sales?: boolean
          approval_scope_logo_use?: boolean
          approval_scope_named_mention?: boolean
          approval_scope_press_release?: boolean
          approval_scope_reference_call?: boolean
          approval_token?: string | null
          company_id: string
          competitors?: string | null
          contact_id?: string | null
          contract_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_approval_status?: string | null
          customer_challenge?: string | null
          customer_contact?: string | null
          customer_contact_id?: string | null
          deleted_at?: string | null
          embedding?: string | null
          embedding_error?: string | null
          embedding_updated_at?: string | null
          employee_count?: number | null
          file_path?: string | null
          full_text?: string | null
          id?: string
          incumbent_provider?: string | null
          industry?: string | null
          is_nda_deal?: boolean
          organization_id?: string | null
          original_document_url?: string | null
          our_solution?: string | null
          project_end?: string | null
          project_start?: string | null
          project_status?: string | null
          status?: Database["public"]["Enums"]["reference_status"]
          summary?: string | null
          tags?: string | null
          title: string
          updated_at?: string | null
          volume_eur?: string | null
          website?: string | null
        }
        Update: {
          anonymized_from_id?: string | null
          approval_comment?: string | null
          approval_competitor_blacklist?: string[]
          approval_consent_file_url?: string | null
          approval_contact_id?: string | null
          approval_coordinator_email?: string | null
          approval_coordinator_name?: string | null
          approval_customer_facing_name?: string | null
          approval_customer_last_sent_at?: string | null
          approval_customer_reminder_sent_at?: string | null
          approval_delegated_to_email?: string | null
          approval_delegated_to_name?: string | null
          approval_expires_at?: string | null
          approval_external_contact_id?: string | null
          approval_grace_until?: string | null
          approval_internal_review_comment?: string | null
          approval_internal_review_token?: string | null
          approval_internal_reviewed_at?: string | null
          approval_internal_reviewer_id?: string | null
          approval_internal_status?: string
          approval_message?: string | null
          approval_owner_name?: string | null
          approval_quote_approved?: string | null
          approval_quote_proposed?: string | null
          approval_reference_call_frequency?: string | null
          approval_reference_giver_name?: string | null
          approval_reference_giver_title?: string | null
          approval_reference_status_snapshot?: string | null
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approval_requester_name?: string | null
          approval_responded_at?: string | null
          approval_scope_anonymous_mention?: boolean
          approval_scope_confidential_sales?: boolean
          approval_scope_logo_use?: boolean
          approval_scope_named_mention?: boolean
          approval_scope_press_release?: boolean
          approval_scope_reference_call?: boolean
          approval_token?: string | null
          company_id?: string
          competitors?: string | null
          contact_id?: string | null
          contract_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_approval_status?: string | null
          customer_challenge?: string | null
          customer_contact?: string | null
          customer_contact_id?: string | null
          deleted_at?: string | null
          embedding?: string | null
          embedding_error?: string | null
          embedding_updated_at?: string | null
          employee_count?: number | null
          file_path?: string | null
          full_text?: string | null
          id?: string
          incumbent_provider?: string | null
          industry?: string | null
          is_nda_deal?: boolean
          organization_id?: string | null
          original_document_url?: string | null
          our_solution?: string | null
          project_end?: string | null
          project_start?: string | null
          project_status?: string | null
          status?: Database["public"]["Enums"]["reference_status"]
          summary?: string | null
          tags?: string | null
          title?: string
          updated_at?: string | null
          volume_eur?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_references_contact_person"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_anonymized_from_id_fkey"
            columns: ["anonymized_from_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_approval_contact_id_fkey"
            columns: ["approval_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_approval_external_contact_id_fkey"
            columns: ["approval_external_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_approval_internal_reviewer_id_fkey"
            columns: ["approval_internal_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_approval_requested_by_fkey"
            columns: ["approval_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_customer_contact_id_fkey"
            columns: ["customer_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alert_dispatches: {
        Row: {
          alert_key: string
          created_at: string
          id: string
          last_sent_at: string
          org_id: string
        }
        Insert: {
          alert_key: string
          created_at?: string
          id?: string
          last_sent_at?: string
          org_id: string
        }
        Update: {
          alert_key?: string
          created_at?: string
          id?: string
          last_sent_at?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alert_dispatches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_portfolios: {
        Row: {
          created_at: string
          customer_manage_token_hash: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          password_hash: string | null
          gate_mode: string
          reference_ids: string[]
          slug: string
          view_count: number
        }
        Insert: {
          created_at?: string
          customer_manage_token_hash?: string | null
          expires_at?: string | null
          gate_mode?: string
          id?: string
          is_active?: boolean
          password_hash?: string | null
          reference_ids?: string[]
          slug: string
          view_count?: number
        }
        Update: {
          created_at?: string
          customer_manage_token_hash?: string | null
          expires_at?: string | null
          gate_mode?: string
          id?: string
          is_active?: boolean
          password_hash?: string | null
          reference_ids?: string[]
          slug?: string
          view_count?: number
        }
        Relationships: []
      }
      shared_portfolio_recipients: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          external_contact_id: string | null
          id: string
          label: string
          shared_portfolio_id: string
          token: string
          visitor_email: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          external_contact_id?: string | null
          id?: string
          label?: string
          shared_portfolio_id: string
          token: string
          visitor_email?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          external_contact_id?: string | null
          id?: string
          label?: string
          shared_portfolio_id?: string
          token?: string
          visitor_email?: string | null
        }
        Relationships: []
      }
      portfolio_view_sessions: {
        Row: {
          active_seconds: number
          country_code: string | null
          ended_at: string | null
          id: string
          last_heartbeat_at: string
          recipient_id: string | null
          shared_portfolio_id: string
          slug: string
          started_at: string
          visitor_email: string | null
          visitor_name: string | null
        }
        Insert: {
          active_seconds?: number
          country_code?: string | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          recipient_id?: string | null
          shared_portfolio_id: string
          slug: string
          started_at?: string
          visitor_email?: string | null
          visitor_name?: string | null
        }
        Update: {
          active_seconds?: number
          country_code?: string | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          recipient_id?: string | null
          shared_portfolio_id?: string
          slug?: string
          started_at?: string
          visitor_email?: string | null
          visitor_name?: string | null
        }
        Relationships: []
      }
      portfolio_view_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          session_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          session_id?: string
        }
        Relationships: []
      }
      stakeholders: {
        Row: {
          attitude: string | null
          company_id: string | null
          created_at: string | null
          id: string
          influence_level: string | null
          last_contact_at: string | null
          last_interaction_at: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          priorities_topics: string | null
          role: string | null
          sentiment: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          attitude?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          influence_level?: string | null
          last_contact_at?: string | null
          last_interaction_at?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          priorities_topics?: string | null
          role?: string | null
          sentiment?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          attitude?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          influence_level?: string | null
          last_contact_at?: string | null
          last_interaction_at?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          priorities_topics?: string | null
          role?: string | null
          sentiment?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string
          status: string
          subject: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          status?: string
          subject: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          status?: string
          subject?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _migration_profile_is_admin: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      _portfolio_public_access_state: {
        Args: {
          p_row: Database["public"]["Tables"]["shared_portfolios"]["Row"]
          p_unlock_token: string
        }
        Returns: string
      }
      _portfolio_session_valid: {
        Args: { p_portfolio_id: string; p_token: string }
        Returns: boolean
      }
      admin_default_has_capability: {
        Args: { p_cap: string }
        Returns: boolean
      }
      complete_client_approval: {
        Args: {
          p_approved_quote?: string
          p_comment: string
          p_consent_file_url?: string
          p_decision: string
          p_reference_giver_name?: string
          p_reference_giver_title?: string
          p_token: string
        }
        Returns: Json
      }
      create_organization: { Args: { org_name: string }; Returns: string }
      upsert_deal_rfp_deadline: {
        Args: {
          p_deal_id: string
          p_organization_id: string
          p_kind: Database["public"]["Enums"]["deal_deadline_kind"]
          p_label: string
          p_due_at: string | null
          p_due_text: string | null
          p_is_approximate: boolean
          p_source_key: string
        }
        Returns: undefined
      }
      create_organization_invite:
        | {
            Args: {
              p_email: string
              p_expires_at: string
              p_role: string
              p_token: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_email: string
              p_expires_at: string
              p_function_role?: Database["public"]["Enums"]["function_role"]
              p_role: string
              p_system_role?: Database["public"]["Enums"]["system_role"]
              p_token: string
            }
            Returns: undefined
          }
      current_user_can_manage_org_data: { Args: never; Returns: boolean }
      current_user_effective_capability: {
        Args: { p_cap: string }
        Returns: boolean
      }
      current_user_function_role: {
        Args: never
        Returns: Database["public"]["Enums"]["function_role"]
      }
      current_user_is_privileged: { Args: never; Returns: boolean }
      current_user_organization_id: { Args: never; Returns: string }
      deactivate_portfolio: {
        Args: { p_manage_token?: string; p_slug: string }
        Returns: boolean
      }
      function_role_default_has_capability: {
        Args: {
          p_cap: string
          p_function_role: Database["public"]["Enums"]["function_role"]
        }
        Returns: boolean
      }
      get_invite_by_token: { Args: { invite_token: string }; Returns: Json }
      get_organization_invite_for_resend: {
        Args: { p_invite_id: string }
        Returns: Json
      }
      get_portfolio_manage_insights: {
        Args: {
          p_manage_token: string
          p_reference_id?: string
          p_slug: string
        }
        Returns: Json
      }
      get_public_portfolio: {
        Args: {
          p_manage_token?: string
          p_slug: string
          p_unlock_token?: string
        }
        Returns: Json
      }
      get_public_portfolio_branding: {
        Args: { p_slug: string; p_unlock_token?: string }
        Returns: Json
      }
      get_public_portfolio_share_owner: {
        Args: { p_slug: string; p_unlock_token?: string }
        Returns: Json
      }
      get_reference_usage_event_counts: {
        Args: { p_reference_id: string }
        Returns: Json
      }
      get_unread_alert_count: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: number
      }
      increment_portfolio_views: {
        Args: { p_slug: string; p_unlock_token?: string }
        Returns: undefined
      }
      industry_needs_master_normalization: {
        Args: { raw: string }
        Returns: boolean
      }
      is_desk_org_staff: { Args: never; Returns: boolean }
      legacy_role_from_dimensions: {
        Args: {
          p_function_role: Database["public"]["Enums"]["function_role"]
          p_system_role: Database["public"]["Enums"]["system_role"]
        }
        Returns: string
      }
      list_organization_pending_invites: { Args: never; Returns: Json }
      log_share_link_viewed: {
        Args: { p_slug: string; p_unlock_token?: string }
        Returns: undefined
      }
      map_legacy_industry_to_master_id: {
        Args: { raw: string }
        Returns: string
      }
      match_references: {
        Args: {
          match_count: number
          match_threshold: number
          p_organization_id: string
          p_sales_visible_only?: boolean
          query_embedding: string
        }
        Returns: {
          company_name: string
          id: string
          industry: string
          similarity: number
          summary: string
          title: string
          volume_eur: string
        }[]
      }
      org_roles_permissions: { Args: never; Returns: Json }
      reset_shared_portfolio_manage_token: {
        Args: { p_reference_id: string }
        Returns: Json
      }
      resolve_industry_id_by_company_name: {
        Args: { company_name: string }
        Returns: string
      }
      resolve_invite_roles: {
        Args: {
          p_function_role: Database["public"]["Enums"]["function_role"]
          p_role: string
          p_system_role: Database["public"]["Enums"]["system_role"]
        }
        Returns: Record<string, unknown>
      }
      set_shared_portfolio_security: {
        Args: {
          p_clear_expires?: boolean
          p_expires_at?: string
          p_gate_mode?: string
          p_password_plain: string
          p_password_remove?: boolean
          p_slug: string
        }
        Returns: Json
      }
      resolve_manage_approval_edit: {
        Args: { p_manage_token: string; p_reference_id: string; p_slug: string }
        Returns: Json
      }
      resolve_shared_portfolio_recipient: {
        Args: { p_slug: string; p_token: string }
        Returns: Json
      }
      try_unlock_shared_portfolio_email: {
        Args: { p_email: string; p_name: string; p_slug: string }
        Returns: Json
      }
      try_unlock_shared_portfolio: {
        Args: { p_password: string; p_slug: string }
        Returns: Json
      }
      try_uuid_from_text: { Args: { raw: string }; Returns: string }
      update_organization_invite_role:
        | { Args: { p_invite_id: string; p_role: string }; Returns: undefined }
        | {
            Args: {
              p_function_role?: Database["public"]["Enums"]["function_role"]
              p_invite_id: string
              p_role: string
              p_system_role?: Database["public"]["Enums"]["system_role"]
            }
            Returns: undefined
          }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      deal_deadline_kind:
        | "submission"
        | "questions"
        | "presentation"
        | "award_expected"
        | "custom"
        | "internal_review"
      deal_deadline_source: "rfp" | "manual"
      deal_document_kind:
        | "ausschreibung"
        | "nda"
        | "vertrag"
        | "angebot"
        | "praesentation"
        | "spezifikation"
        | "notiz"
        | "sonstiges"
      function_role: "sales_rep" | "account_manager" | "sales_leader"
      reference_status:
        | "draft"
        | "internal_only"
        | "approved"
        | "anonymized"
        | "external"
        | "restricted"
      stakeholder_role:
        | "economic_buyer"
        | "champion"
        | "blocker"
        | "technical_buyer"
        | "user_buyer"
        | "unknown"
      system_role: "owner" | "admin" | "member" | "viewer"
      user_role: "admin" | "sales" | "account_owner" | "account_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      approval_status: ["pending", "approved", "rejected"],
      function_role: ["sales_rep", "account_manager", "sales_leader"],
      reference_status: [
        "draft",
        "internal_only",
        "approved",
        "anonymized",
        "external",
        "restricted",
      ],
      stakeholder_role: [
        "economic_buyer",
        "champion",
        "blocker",
        "technical_buyer",
        "user_buyer",
        "unknown",
      ],
      system_role: ["owner", "admin", "member", "viewer"],
      user_role: ["admin", "sales", "account_owner", "account_manager"],
    },
  },
} as const
