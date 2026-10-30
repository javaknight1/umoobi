export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_members: {
        Row: {
          account_id: string
          role: string
          user_id: string
        }
        Insert: {
          account_id: string
          role?: string
          user_id: string
        }
        Update: {
          account_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          account_id: string
          created_at: string
          expires_at: string
          id: string
          viewer_id: string
          withdrawn_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          expires_at?: string
          id?: string
          viewer_id: string
          withdrawn_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          viewer_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          film_id: string
          id: string
          reason: string
          reporter_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          film_id: string
          id?: string
          reason: string
          reporter_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          film_id?: string
          id?: string
          reason?: string
          reporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          billing_order: number
          film_id: string
          id: string
          person_id: string
          role: string
          share_bps: number
        }
        Insert: {
          billing_order?: number
          film_id: string
          id?: string
          person_id: string
          role: string
          share_bps?: number
        }
        Update: {
          billing_order?: number
          film_id?: string
          id?: string
          person_id?: string
          role?: string
          share_bps?: number
        }
        Relationships: [
          {
            foreignKeyName: "credits_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          film_id: string
          first_played_at: string | null
          id: string
          kind: string
          order_id: string
          rental_hours: number | null
          revoked_at: string | null
          viewer_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          film_id: string
          first_played_at?: string | null
          id?: string
          kind: string
          order_id: string
          rental_hours?: number | null
          revoked_at?: string | null
          viewer_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          film_id?: string
          first_played_at?: string | null
          id?: string
          kind?: string
          order_id?: string
          rental_hours?: number | null
          revoked_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      film_assets: {
        Row: {
          created_at: string
          duration_seconds: number | null
          film_id: string
          id: string
          kind: string
          label: string | null
          language: string | null
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          status: string
          subtitle_url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          film_id: string
          id?: string
          kind: string
          label?: string | null
          language?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          status?: string
          subtitle_url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          film_id?: string
          id?: string
          kind?: string
          label?: string | null
          language?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          status?: string
          subtitle_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "film_assets_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      film_daily_stats: {
        Row: {
          checkout_starts: number
          completions: number
          day: string
          dropoff: Json
          film_id: string
          plays: number
          purchases: number
          regions: Json
          sources: Json
          trailer_plays: number
          views: number
        }
        Insert: {
          checkout_starts?: number
          completions?: number
          day: string
          dropoff?: Json
          film_id: string
          plays?: number
          purchases?: number
          regions?: Json
          sources?: Json
          trailer_plays?: number
          views?: number
        }
        Update: {
          checkout_starts?: number
          completions?: number
          day?: string
          dropoff?: Json
          film_id?: string
          plays?: number
          purchases?: number
          regions?: Json
          sources?: Json
          trailer_plays?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "film_daily_stats_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      filmmaker_accounts: {
        Row: {
          approved_at: string | null
          created_at: string
          display_name: string
          fee_bps: number
          founding_rate_until: string | null
          id: string
          identity_session_id: string | null
          identity_status: string
          legal_name: string | null
          owner_id: string
          past_work: string | null
          payout_hold: boolean
          payouts_enabled: boolean
          slug: string
          status: string
          stripe_account_id: string | null
          tier: string
          vetting_score: number | null
          website: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          display_name: string
          fee_bps?: number
          founding_rate_until?: string | null
          id?: string
          identity_session_id?: string | null
          identity_status?: string
          legal_name?: string | null
          owner_id: string
          past_work?: string | null
          payout_hold?: boolean
          payouts_enabled?: boolean
          slug: string
          status?: string
          stripe_account_id?: string | null
          tier?: string
          vetting_score?: number | null
          website?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          display_name?: string
          fee_bps?: number
          founding_rate_until?: string | null
          id?: string
          identity_session_id?: string | null
          identity_status?: string
          legal_name?: string | null
          owner_id?: string
          past_work?: string | null
          payout_hold?: boolean
          payouts_enabled?: boolean
          slug?: string
          status?: string
          stripe_account_id?: string | null
          tier?: string
          vetting_score?: number | null
          website?: string | null
        }
        Relationships: []
      }
      films: {
        Row: {
          account_id: string
          ai_declared_at: string | null
          ai_flagged: boolean
          ai_generated: boolean
          cap_year: number
          content_rating: string | null
          created_at: string
          genre: string | null
          id: string
          poster_url: string | null
          published_at: string | null
          pulled_at: string | null
          rejection_reason: string | null
          release_year: number | null
          rights_statement_at: string | null
          runtime_seconds: number | null
          search: unknown
          slug: string
          staff_approved: boolean
          status: string
          synopsis: string | null
          title: string
          vetting_score: number | null
        }
        Insert: {
          account_id: string
          ai_declared_at?: string | null
          ai_flagged?: boolean
          ai_generated?: boolean
          cap_year?: number
          content_rating?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          poster_url?: string | null
          published_at?: string | null
          pulled_at?: string | null
          rejection_reason?: string | null
          release_year?: number | null
          rights_statement_at?: string | null
          runtime_seconds?: number | null
          search?: unknown
          slug: string
          staff_approved?: boolean
          status?: string
          synopsis?: string | null
          title: string
          vetting_score?: number | null
        }
        Update: {
          account_id?: string
          ai_declared_at?: string | null
          ai_flagged?: boolean
          ai_generated?: boolean
          cap_year?: number
          content_rating?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          poster_url?: string | null
          published_at?: string | null
          pulled_at?: string | null
          rejection_reason?: string | null
          release_year?: number | null
          rights_statement_at?: string | null
          runtime_seconds?: number | null
          search?: unknown
          slug?: string
          staff_approved?: boolean
          status?: string
          synopsis?: string | null
          title?: string
          vetting_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "films_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          account_id: string | null
          created_at: string
          follower_id: string
          person_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          follower_id: string
          person_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          follower_id?: string
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          id: number
          kind: string
          last_error: string | null
          payload: Json
          run_after: string
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: never
          kind: string
          last_error?: string | null
          payload?: Json
          run_after?: string
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: never
          kind?: string
          last_error?: string | null
          payload?: Json
          run_after?: string
          status?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount_cents: number
          available_on: string
          created_at: string
          id: number
          kind: string
          memo: string | null
          order_id: string | null
          payout_id: string | null
        }
        Insert: {
          account_id: string
          amount_cents: number
          available_on?: string
          created_at?: string
          id?: never
          kind: string
          memo?: string | null
          order_id?: string | null
          payout_id?: string | null
        }
        Update: {
          account_id?: string
          amount_cents?: number
          available_on?: string
          created_at?: string
          id?: never
          kind?: string
          memo?: string | null
          order_id?: string | null
          payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          film_id: string
          list_id: string
          position: number
        }
        Insert: {
          film_id: string
          list_id: string
          position?: number
        }
        Update: {
          film_id?: string
          list_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "list_items_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          owner_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          owner_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          owner_id?: string
          title?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean
          created_at: string
          film_id: string
          id: string
          kind: string
          price_cents: number
          rental_hours: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          film_id: string
          id?: string
          kind: string
          price_cents: number
          rental_hours?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          film_id?: string
          id?: string
          kind?: string
          price_cents?: number
          rental_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_id: string
          created_at: string
          film_id: string
          id: string
          kind: string
          license_ack_at: string | null
          offer_id: string
          paid_at: string | null
          refunded_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          viewer_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          film_id: string
          id?: string
          kind: string
          license_ack_at?: string | null
          offer_id: string
          paid_at?: string | null
          refunded_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents: number
          tax_cents?: number
          total_cents?: number
          viewer_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          film_id?: string
          id?: string
          kind?: string
          license_ack_at?: string | null
          offer_id?: string
          paid_at?: string | null
          refunded_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      page_events: {
        Row: {
          created_at: string
          event: string
          film_id: string | null
          id: number
          region: string | null
          session_id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          event: string
          film_id?: string | null
          id?: never
          region?: string | null
          session_id: string
          source?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          film_id?: string | null
          id?: never
          region?: string | null
          session_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_events_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          account_id: string
          amount_cents: number
          created_at: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          account_id: string
          amount_cents: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          account_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          bio: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          created_by_account: string | null
          id: string
          invite_email: string | null
          invite_token: string | null
          name: string
          photo_url: string | null
          slug: string
        }
        Insert: {
          bio?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by_account?: string | null
          id?: string
          invite_email?: string | null
          invite_token?: string | null
          name: string
          photo_url?: string | null
          slug: string
        }
        Update: {
          bio?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by_account?: string | null
          id?: string
          invite_email?: string | null
          invite_token?: string | null
          name?: string
          photo_url?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_created_by_account_fkey"
            columns: ["created_by_account"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      playback_events: {
        Row: {
          created_at: string
          event: string
          film_id: string
          id: number
          position_seconds: number
          session_id: string
        }
        Insert: {
          created_at?: string
          event: string
          film_id: string
          id?: never
          position_seconds: number
          session_id: string
        }
        Update: {
          created_at?: string
          event?: string
          film_id?: string
          id?: never
          position_seconds?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playback_events_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_year: number | null
          created_at: string
          display_name: string | null
          id: string
          roles: string[]
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          id: string
          roles?: string[]
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          roles?: string[]
        }
        Relationships: []
      }
      review_items: {
        Row: {
          account_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          due_at: string | null
          film_id: string | null
          id: string
          kind: string
          reason: string | null
          score: number | null
          status: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          due_at?: string | null
          film_id?: string | null
          id?: string
          kind: string
          reason?: string | null
          score?: number | null
          status?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          due_at?: string | null
          film_id?: string | null
          id?: string
          kind?: string
          reason?: string | null
          score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_items_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          film_id: string
          id: string
          rating: number
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          film_id: string
          id?: string
          rating: number
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          film_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      shelf_items: {
        Row: {
          film_id: string
          position: number
          shelf_id: string
        }
        Insert: {
          film_id: string
          position?: number
          shelf_id: string
        }
        Update: {
          film_id?: string
          position?: number
          shelf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelf_items_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelf_items_shelf_id_fkey"
            columns: ["shelf_id"]
            isOneToOne: false
            referencedRelation: "shelves"
            referencedColumns: ["id"]
          },
        ]
      }
      shelves: {
        Row: {
          active: boolean
          id: string
          position: number
          slug: string
          title: string
        }
        Insert: {
          active?: boolean
          id?: string
          position?: number
          slug: string
          title: string
        }
        Update: {
          active?: boolean
          id?: string
          position?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      staff_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          detail: Json
          id: number
          target: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          detail?: Json
          id?: never
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          detail?: Json
          id?: never
          target?: string | null
        }
        Relationships: []
      }
      strikes: {
        Row: {
          account_id: string
          created_at: string
          film_id: string | null
          id: string
          note: string | null
          reason: string
        }
        Insert: {
          account_id: string
          created_at?: string
          film_id?: string | null
          id?: string
          note?: string | null
          reason: string
        }
        Update: {
          account_id?: string
          created_at?: string
          film_id?: string | null
          id?: string
          note?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "strikes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strikes_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      takedowns: {
        Row: {
          claimant_email: string
          claimant_name: string
          counter_notice: string | null
          counter_received_at: string | null
          created_at: string
          film_id: string | null
          good_faith: boolean
          id: string
          infringing_url: string
          restore_after: string | null
          signature: string
          status: string
          work_described: string
        }
        Insert: {
          claimant_email: string
          claimant_name: string
          counter_notice?: string | null
          counter_received_at?: string | null
          created_at?: string
          film_id?: string | null
          good_faith: boolean
          id?: string
          infringing_url: string
          restore_after?: string | null
          signature: string
          status?: string
          work_described: string
        }
        Update: {
          claimant_email?: string
          claimant_name?: string
          counter_notice?: string | null
          counter_received_at?: string | null
          created_at?: string
          film_id?: string | null
          good_faith?: boolean
          id?: string
          infringing_url?: string
          restore_after?: string | null
          signature?: string
          status?: string
          work_described?: string
        }
        Relationships: [
          {
            foreignKeyName: "takedowns_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          account_id: string | null
          created_at: string
          film_id: string | null
          id: string
          score: number
          signals: Json
          subject: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          film_id?: string | null
          id?: string
          score: number
          signals?: Json
          subject: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          film_id?: string | null
          id?: string
          score?: number
          signals?: Json
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "filmmaker_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          confirm_token: string
          confirmed_at: string | null
          created_at: string
          email: string
          film_kind: string | null
          film_title: string | null
          id: string
          launch_emails: boolean
          role: string
          sells_today: string | null
          source: string | null
          trailer_url: string | null
        }
        Insert: {
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          film_kind?: string | null
          film_title?: string | null
          id?: string
          launch_emails?: boolean
          role: string
          sells_today?: string | null
          source?: string | null
          trailer_url?: string | null
        }
        Update: {
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          film_kind?: string | null
          film_title?: string | null
          id?: string
          launch_emails?: boolean
          role?: string
          sells_today?: string | null
          source?: string | null
          trailer_url?: string | null
        }
        Relationships: []
      }
      watch_progress: {
        Row: {
          film_id: string
          position_seconds: number
          updated_at: string
          viewer_id: string
        }
        Insert: {
          film_id: string
          position_seconds?: number
          updated_at?: string
          viewer_id: string
        }
        Update: {
          film_id?: string
          position_seconds?: number
          updated_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_progress_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          id: string
          provider: string
          received_at: string
          type: string
        }
        Insert: {
          id: string
          provider: string
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          provider?: string
          received_at?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      available_balance_cents: {
        Args: { a: string; on_date?: string }
        Returns: number
      }
      because_you_watched: {
        Args: { p_limit?: number }
        Returns: {
          film_id: string
          score: number
        }[]
      }
      can_manage_film: { Args: { f: string }; Returns: boolean }
      can_review: { Args: { f: string }; Returns: boolean }
      cap_for: { Args: { kind: string; tier: string }; Returns: number }
      claim_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          id: number
          kind: string
          last_error: string | null
          payload: Json
          run_after: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_person: { Args: { p_token: string }; Returns: string }
      credit_shares_ok: { Args: { f: string }; Returns: boolean }
      estimated_processing_cents: { Args: { total: number }; Returns: number }
      fee_cents: {
        Args: { a: string; at?: string; subtotal: number }
        Returns: number
      }
      film_is_public: { Args: { f: string }; Returns: boolean }
      film_is_purchasable: { Args: { f: string }; Returns: boolean }
      film_kind: { Args: { runtime_seconds: number }; Returns: string }
      film_rating: {
        Args: { p_film: string }
        Returns: {
          average: number
          count: number
        }[]
      }
      films_used: {
        Args: { a: string; kind: string; yr: number }
        Returns: number
      }
      finish_job: {
        Args: { p_error?: string; p_id: number }
        Returns: undefined
      }
      has_role: { Args: { r: string }; Returns: boolean }
      is_account_member: { Args: { a: string }; Returns: boolean }
      order_ledger_mismatches: {
        Args: never
        Returns: {
          ledger_cents: number
          order_id: string
          total_cents: number
        }[]
      }
      publish_blockers: { Args: { f: string }; Returns: string[] }
      publish_film: { Args: { f: string }; Returns: undefined }
      pull_film: { Args: { f: string }; Returns: number }
      record_refund: {
        Args: { p_order: string; p_reason?: string }
        Returns: undefined
      }
      record_sale: {
        Args: {
          p_charge: string
          p_order: string
          p_payment_intent: string
          p_processing_cents: number
          p_tax_cents: number
        }
        Returns: undefined
      }
      requeue_stale_jobs: { Args: never; Returns: number }
      save_credits: {
        Args: { p_credits: Json; p_film: string }
        Returns: undefined
      }
      search_films: {
        Args: { p_limit?: number; q: string }
        Returns: {
          film_id: string
          rank: number
        }[]
      }
      search_people: {
        Args: { p_limit?: number; q: string }
        Returns: {
          person_id: string
          rank: number
        }[]
      }
      start_playback: {
        Args: { f: string }
        Returns: {
          created_at: string
          expires_at: string | null
          film_id: string
          first_played_at: string | null
          id: string
          kind: string
          order_id: string
          rental_hours: number | null
          revoked_at: string | null
          viewer_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entitlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trending_films: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          film_id: string
          score: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

