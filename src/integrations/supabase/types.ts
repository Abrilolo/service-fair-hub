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
      checkins: {
        Row: {
          checkin_id: string
          estado: Database["public"]["Enums"]["checkin_estado"]
          estudiante_id: string
          fecha_hora: string
          proyecto_id: string | null
          verificado_por_usuario_id: string
        }
        Insert: {
          checkin_id?: string
          estado?: Database["public"]["Enums"]["checkin_estado"]
          estudiante_id: string
          fecha_hora?: string
          proyecto_id?: string | null
          verificado_por_usuario_id: string
        }
        Update: {
          checkin_id?: string
          estado?: Database["public"]["Enums"]["checkin_estado"]
          estudiante_id?: string
          fecha_hora?: string
          proyecto_id?: string | null
          verificado_por_usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: true
            referencedRelation: "estudiantes"
            referencedColumns: ["estudiante_id"]
          },
          {
            foreignKeyName: "checkins_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "checkins_verificado_por_usuario_id_fkey"
            columns: ["verificado_por_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      codigos_temporales: {
        Row: {
          codigo_hash: string
          codigo_id: string
          creado_por_usuario_id: string
          created_at: string
          expira_en: string
          proyecto_id: string
          usado: boolean
          usado_en: string | null
          usado_por_estudiante_id: string | null
        }
        Insert: {
          codigo_hash: string
          codigo_id?: string
          creado_por_usuario_id: string
          created_at?: string
          expira_en: string
          proyecto_id: string
          usado?: boolean
          usado_en?: string | null
          usado_por_estudiante_id?: string | null
        }
        Update: {
          codigo_hash?: string
          codigo_id?: string
          creado_por_usuario_id?: string
          created_at?: string
          expira_en?: string
          proyecto_id?: string
          usado?: boolean
          usado_en?: string | null
          usado_por_estudiante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codigos_temporales_creado_por_usuario_id_fkey"
            columns: ["creado_por_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "codigos_temporales_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "codigos_temporales_usado_por_estudiante_id_fkey"
            columns: ["usado_por_estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["estudiante_id"]
          },
        ]
      }
      estudiantes: {
        Row: {
          carrera: string
          correo: string
          created_at: string
          estudiante_id: string
          matricula: string
          nombre: string
        }
        Insert: {
          carrera: string
          correo: string
          created_at?: string
          estudiante_id?: string
          matricula: string
          nombre: string
        }
        Update: {
          carrera?: string
          correo?: string
          created_at?: string
          estudiante_id?: string
          matricula?: string
          nombre?: string
        }
        Relationships: []
      }
      logs_evento: {
        Row: {
          actor_usuario_id: string | null
          created_at: string
          entidad: string
          entidad_id: string | null
          log_id: string
          metadata: Json | null
          tipo_evento: string
        }
        Insert: {
          actor_usuario_id?: string | null
          created_at?: string
          entidad: string
          entidad_id?: string | null
          log_id?: string
          metadata?: Json | null
          tipo_evento: string
        }
        Update: {
          actor_usuario_id?: string | null
          created_at?: string
          entidad?: string
          entidad_id?: string | null
          log_id?: string
          metadata?: Json | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_evento_actor_usuario_id_fkey"
            columns: ["actor_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      proyectos: {
        Row: {
          activo: boolean
          created_at: string
          cupo_disponible: number
          cupo_total: number
          descripcion: string | null
          fecha_fin: string
          fecha_inicio: string
          nombre: string
          proyecto_id: string
          socio_usuario_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cupo_disponible: number
          cupo_total: number
          descripcion?: string | null
          fecha_fin: string
          fecha_inicio: string
          nombre: string
          proyecto_id?: string
          socio_usuario_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          cupo_disponible?: number
          cupo_total?: number
          descripcion?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          nombre?: string
          proyecto_id?: string
          socio_usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_socio_usuario_id_fkey"
            columns: ["socio_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      registros_proyecto: {
        Row: {
          codigo_id: string
          estado: Database["public"]["Enums"]["registro_estado"]
          estudiante_id: string
          fecha_hora: string
          proyecto_id: string
          registro_id: string
        }
        Insert: {
          codigo_id: string
          estado?: Database["public"]["Enums"]["registro_estado"]
          estudiante_id: string
          fecha_hora?: string
          proyecto_id: string
          registro_id?: string
        }
        Update: {
          codigo_id?: string
          estado?: Database["public"]["Enums"]["registro_estado"]
          estudiante_id?: string
          fecha_hora?: string
          proyecto_id?: string
          registro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_proyecto_codigo_id_fkey"
            columns: ["codigo_id"]
            isOneToOne: true
            referencedRelation: "codigos_temporales"
            referencedColumns: ["codigo_id"]
          },
          {
            foreignKeyName: "registros_proyecto_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: true
            referencedRelation: "estudiantes"
            referencedColumns: ["estudiante_id"]
          },
          {
            foreignKeyName: "registros_proyecto_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          activo: boolean
          auth_id: string | null
          created_at: string
          email: string
          nombre: string
          rol: Database["public"]["Enums"]["app_role"]
          updated_at: string
          usuario_id: string
        }
        Insert: {
          activo?: boolean
          auth_id?: string | null
          created_at?: string
          email: string
          nombre: string
          rol: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          usuario_id?: string
        }
        Update: {
          activo?: boolean
          auth_id?: string | null
          created_at?: string
          email?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "SOCIO" | "BECARIO"
      checkin_estado: "PENDIENTE" | "PRESENTE"
      registro_estado: "CONFIRMADO" | "CANCELADO"
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
      app_role: ["ADMIN", "SOCIO", "BECARIO"],
      checkin_estado: ["PENDIENTE", "PRESENTE"],
      registro_estado: ["CONFIRMADO", "CANCELADO"],
    },
  },
} as const
