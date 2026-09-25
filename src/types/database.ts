export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          age: number | null;
          gender: string | null;
          occupation: string | null;
          address: string | null;
          emergency_contacts: EmergencyContact[];
          safety_credits: number;
          profile_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          age?: number | null;
          gender?: string | null;
          occupation?: string | null;
          address?: string | null;
          emergency_contacts?: EmergencyContact[];
          safety_credits?: number;
          profile_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          age?: number | null;
          gender?: string | null;
          occupation?: string | null;
          address?: string | null;
          emergency_contacts?: EmergencyContact[];
          safety_credits?: number;
          profile_completed?: boolean;
          updated_at?: string;
        };
      };
      safe_havens: {
        Row: {
          id: string;
          name: string;
          type: 'hospital' | 'police' | 'fire_station' | '24_7_business' | 'other';
          address: string;
          latitude: number;
          longitude: number;
          phone: string | null;
          is_verified: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'hospital' | 'police' | 'fire_station' | '24_7_business' | 'other';
          address: string;
          latitude: number;
          longitude: number;
          phone?: string | null;
          is_verified?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          type?: 'hospital' | 'police' | 'fire_station' | '24_7_business' | 'other';
          address?: string;
          latitude?: number;
          longitude?: number;
          phone?: string | null;
          is_verified?: boolean;
        };
      };
      safety_reports: {
        Row: {
          id: string;
          user_id: string;
          report_type: 'broken_light' | 'unsafe_area' | 'safe_spot' | 'other';
          description: string;
          latitude: number;
          longitude: number;
          photo_url: string | null;
          severity: number;
          status: 'pending' | 'verified' | 'resolved';
          upvotes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_type: 'broken_light' | 'unsafe_area' | 'safe_spot' | 'other';
          description: string;
          latitude: number;
          longitude: number;
          photo_url?: string | null;
          severity?: number;
          status?: 'pending' | 'verified' | 'resolved';
          upvotes?: number;
          created_at?: string;
        };
        Update: {
          report_type?: 'broken_light' | 'unsafe_area' | 'safe_spot' | 'other';
          description?: string;
          photo_url?: string | null;
          severity?: number;
          status?: 'pending' | 'verified' | 'resolved';
          upvotes?: number;
        };
      };
      guardian_sessions: {
        Row: {
          id: string;
          user_id: string;
          start_location: Location;
          end_location: Location | null;
          current_location: LocationWithTimestamp | null;
          status: 'active' | 'completed' | 'emergency';
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          start_location: Location;
          end_location?: Location | null;
          current_location?: LocationWithTimestamp | null;
          status?: 'active' | 'completed' | 'emergency';
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          end_location?: Location | null;
          current_location?: LocationWithTimestamp | null;
          status?: 'active' | 'completed' | 'emergency';
          completed_at?: string | null;
        };
      };
      route_ratings: {
        Row: {
          id: string;
          user_id: string;
          route_hash: string;
          safety_score: number;
          rating: number;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          route_hash: string;
          safety_score: number;
          rating: number;
          feedback?: string | null;
          created_at?: string;
        };
        Update: {
          safety_score?: number;
          rating?: number;
          feedback?: string | null;
        };
      };
    };
  };
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface LocationWithTimestamp extends Location {
  timestamp: string;
}
