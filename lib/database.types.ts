export type Database = {
  public: {
    Tables: {
      weeks: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      day_schedules: {
        Row: {
          id: string;
          week_id: string;
          work_date: string;
          check_in: string | null;
          check_out: string | null;
          is_day_off: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          week_id: string;
          work_date: string;
          check_in?: string | null;
          check_out?: string | null;
          is_day_off?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          week_id?: string;
          work_date?: string;
          check_in?: string | null;
          check_out?: string | null;
          is_day_off?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "day_schedules_week_id_fkey";
            columns: ["week_id"];
            isOneToOne: false;
            referencedRelation: "weeks";
            referencedColumns: ["id"];
          },
        ];
      };
      custom_events: {
        Row: {
          id: string;
          title: string;
          event_date: string;
          event_time: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          event_date: string;
          event_time: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          event_date?: string;
          event_time?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
