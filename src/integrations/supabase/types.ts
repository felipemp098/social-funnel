export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'manager' | 'user'
          created_by: string | null
          created_at: string
          updated_at: string
          first_login: boolean
        }
        Insert: {
          id: string
          email: string
          role?: 'admin' | 'manager' | 'user'
          created_by?: string | null
          created_at?: string
          updated_at?: string
          first_login?: boolean
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'manager' | 'user'
          created_by?: string | null
          created_at?: string
          updated_at?: string
          first_login?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "app_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          owner_id: string
          name: string
          segment: string | null
          budget: string | null
          temperature: 'frio' | 'morno' | 'quente' | null
          notes: string | null
          goals: Json | null
          sheet_url: string | null
          sheet_tab: string | null
          sheet_mapping: Json | null
          sheet_status: 'not_linked' | 'linked_pending' | 'linked_warn' | 'linked_ok' | 'linked_complete' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          segment?: string | null
          budget?: string | null
          temperature?: 'frio' | 'morno' | 'quente' | null
          notes?: string | null
          goals?: Json | null
          sheet_url?: string | null
          sheet_tab?: string | null
          sheet_mapping?: Json | null
          sheet_status?: 'not_linked' | 'linked_pending' | 'linked_warn' | 'linked_ok' | 'linked_complete' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          segment?: string | null
          budget?: string | null
          temperature?: 'frio' | 'morno' | 'quente' | null
          notes?: string | null
          goals?: Json | null
          sheet_url?: string | null
          sheet_tab?: string | null
          sheet_mapping?: Json | null
          sheet_status?: 'not_linked' | 'linked_pending' | 'linked_warn' | 'linked_ok' | 'linked_complete' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          id: string
          owner_id: string
          client_id: string | null
          period_start: string
          period_end: string
          target_responses: number | null
          target_meetings: number | null
          target_sales: number | null
          target_revenue: number | null
          actual_responses: number | null
          actual_meetings: number | null
          actual_sales: number | null
          actual_revenue: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          client_id?: string | null
          period_start: string
          period_end: string
          target_responses?: number | null
          target_meetings?: number | null
          target_sales?: number | null
          target_revenue?: number | null
          actual_responses?: number | null
          actual_meetings?: number | null
          actual_sales?: number | null
          actual_revenue?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          client_id?: string | null
          period_start?: string
          period_end?: string
          target_responses?: number | null
          target_meetings?: number | null
          target_sales?: number | null
          target_revenue?: number | null
          actual_responses?: number | null
          actual_meetings?: number | null
          actual_sales?: number | null
          actual_revenue?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          }
        ]
      }
      prospects: {
        Row: {
          id: number
          owner_id: string
          client_id: string | null
          contact_name: string
          contact_email: string | null
          contact_phone: string | null
          company: string | null
          position: string | null
          source: 'inbound' | 'outbound' | null
          status: 'new' | 'contacted' | 'responded' | 'meeting_scheduled' | 'meeting_done' | 'proposal_sent' | 'won' | 'lost' | 'follow_up' | null
          temperature: 'hot' | 'warm' | 'cold' | null
          notes: string | null
          last_contact_date: string | null
          next_follow_up: string | null
          deal_value: number | null
          probability: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          owner_id: string
          client_id?: string | null
          contact_name: string
          contact_email?: string | null
          contact_phone?: string | null
          company?: string | null
          position?: string | null
          source?: 'inbound' | 'outbound' | null
          status?: 'new' | 'contacted' | 'responded' | 'meeting_scheduled' | 'meeting_done' | 'proposal_sent' | 'won' | 'lost' | 'follow_up' | null
          temperature?: 'hot' | 'warm' | 'cold' | null
          notes?: string | null
          last_contact_date?: string | null
          next_follow_up?: string | null
          deal_value?: number | null
          probability?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          owner_id?: string
          client_id?: string | null
          contact_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          company?: string | null
          position?: string | null
          source?: 'inbound' | 'outbound' | null
          status?: 'new' | 'contacted' | 'responded' | 'meeting_scheduled' | 'meeting_done' | 'proposal_sent' | 'won' | 'lost' | 'follow_up' | null
          temperature?: 'hot' | 'warm' | 'cold' | null
          notes?: string | null
          last_contact_date?: string | null
          next_follow_up?: string | null
          deal_value?: number | null
          probability?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          bio: string | null
          preferences: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      scripts: {
        Row: {
          id: string
          owner_id: string
          title: string
          tags: string[] | null
          content: string
          visibility: 'private' | 'team' | 'public'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          tags?: string[] | null
          content?: string
          visibility?: 'private' | 'team' | 'public'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          tags?: string[] | null
          content?: string
          visibility?: 'private' | 'team' | 'public'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      user_hierarchy_stats: {
        Row: {
          id: string | null
          email: string | null
          role: 'admin' | 'manager' | 'user' | null
          created_by: string | null
          path: string | null
          level: number | null
          ancestors: string[] | null
          total_prospects: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      user_prospect_stats: {
        Row: {
          owner_id: string | null
          owner_email: string | null
          owner_role: 'admin' | 'manager' | 'user' | null
          total_prospects: number | null
          inbound_prospects: number | null
          outbound_prospects: number | null
          won_prospects: number | null
          lost_prospects: number | null
          avg_deal_value: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string | null
          email: string | null
          role: 'admin' | 'manager' | 'user' | null
          created_by: string | null
          user_created_at: string | null
          user_updated_at: string | null
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          bio: string | null
          preferences: Json | null
          profile_created_at: string | null
          profile_updated_at: string | null
          display_name: string | null
          effective_avatar: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage: {
        Args: {
          actor: string
          owner: string
        }
        Returns: boolean
      }
      create_sample_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_descendants: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          email: string
          role: 'admin' | 'manager' | 'user'
          created_by: string
          level: number
        }[]
      }
      get_user_hierarchy_path: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      is_admin: {
        Args: {
          uid: string
        }
        Returns: boolean
      }
      is_ancestor: {
        Args: {
          ancestor: string
          descendant: string
        }
        Returns: boolean
      }
      promote_to_admin: {
        Args: {
          user_email: string
        }
        Returns: boolean
      }
      validate_user_creation: {
        Args: {
          creator_id: string
          new_role: 'admin' | 'manager' | 'user'
          new_created_by: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'user'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Tipos de conveniência
export type UserRole = Database['public']['Enums']['user_role']
export type ScriptVisibility = 'private' | 'public'
export type AppUser = Database['public']['Tables']['app_users']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Prospect = Database['public']['Tables']['prospects']['Row']
export type Goal = Database['public']['Tables']['goals']['Row']
export type Script = Database['public']['Tables']['scripts']['Row']

// Tipos para inserção
export type AppUserInsert = Database['public']['Tables']['app_users']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ProspectInsert = Database['public']['Tables']['prospects']['Insert']
export type GoalInsert = Database['public']['Tables']['goals']['Insert']
export type ScriptInsert = Database['public']['Tables']['scripts']['Insert']

// Tipos para atualização
export type AppUserUpdate = Database['public']['Tables']['app_users']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']
export type ProspectUpdate = Database['public']['Tables']['prospects']['Update']
export type GoalUpdate = Database['public']['Tables']['goals']['Update']
export type ScriptUpdate = Database['public']['Tables']['scripts']['Update']

// Tipos para views
export type UserHierarchyStats = Database['public']['Views']['user_hierarchy_stats']['Row']
export type UserProspectStats = Database['public']['Views']['user_prospect_stats']['Row']
export type UserProfile = Database['public']['Views']['user_profiles']['Row']

// Tipos estendidos com relacionamentos
export type AppUserWithCreator = AppUser & {
  creator?: AppUser
}

export type ClientWithOwner = Client & {
  owner: AppUser
}

export type ProspectWithRelations = Prospect & {
  owner: AppUser
  client?: Client
}

export type GoalWithRelations = Goal & {
  owner: AppUser
  client?: Client
}

export type ScriptWithOwner = Script & {
  owner: AppUser
}

// Tipos para formulários
export type CreateUserForm = {
  email: string
  role: UserRole
  created_by?: string
}

export type CreateClientForm = Omit<ClientInsert, 'id' | 'owner_id' | 'created_at' | 'updated_at'>
export type CreateProspectForm = Omit<ProspectInsert, 'id' | 'owner_id' | 'created_at' | 'updated_at'>
export type CreateGoalForm = Omit<GoalInsert, 'id' | 'owner_id' | 'created_at' | 'updated_at'>
export type CreateScriptForm = Omit<ScriptInsert, 'id' | 'owner_id' | 'created_at' | 'updated_at'>

export const Constants = {
  public: {
    Enums: {
      user_role: ['admin', 'manager', 'user'] as const,
    },
  },
} as const