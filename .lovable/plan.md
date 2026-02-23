

## Plan: Autenticacion por Roles + RLS + CRUD Proyectos

### Resumen

Se implementara autenticacion con email/password vinculada a la tabla `usuarios` existente, se reemplazaran todas las politicas RLS anonimas por politicas basadas en roles, se creara CRUD de proyectos para SOCIO/ADMIN, y se protegeran las rutas del frontend segun rol.

---

### Paso 1: Migracion de Base de Datos

Se ejecutara una migracion SQL que:

**a) Crear tabla `user_roles`** (requerida por seguridad para evitar escalacion de privilegios):

```text
user_roles
- id (PK, uuid)
- user_id (FK -> auth.users.id, ON DELETE CASCADE)
- role (app_role)
- UNIQUE(user_id, role)
- RLS habilitado
```

**b) Agregar columna `auth_id`** a la tabla `usuarios`:
- `auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL`
- Esto vincula el usuario del dominio con el usuario autenticado

**c) Crear funcion `has_role` (SECURITY DEFINER)**:
- Consulta `user_roles` para verificar si un usuario tiene un rol especifico
- Evita recursion en politicas RLS

**d) Crear funcion `get_user_role`**:
- Retorna el rol de un usuario desde `user_roles`
- Usada internamente por las politicas

**e) Eliminar TODAS las politicas anonimas existentes** en las 7 tablas

**f) Crear nuevas politicas RLS por rol**:

| Tabla | ADMIN | SOCIO | BECARIO | authenticated |
|-------|-------|-------|---------|---------------|
| usuarios | SELECT all | SELECT own | SELECT own | - |
| proyectos | ALL | SELECT/INSERT/UPDATE own | SELECT all | - |
| codigos_temporales | ALL | CRUD own projects | - | - |
| registros_proyecto | ALL | SELECT own projects | SELECT | - |
| checkins | ALL | - | INSERT/UPDATE/SELECT | - |
| logs_evento | SELECT all | SELECT own | SELECT own | - |
| estudiantes | ALL | SELECT | SELECT | - |

**g) Crear trigger** para auto-crear registro en `user_roles` cuando se inserte en `usuarios`

---

### Paso 2: Edge Function para Registro de Usuarios

Crear edge function `register-user` que:
1. Recibe email, password, nombre, rol
2. Crea usuario en Auth (supabase.auth.admin.createUser)
3. Inserta registro en `usuarios` con el `auth_id` correspondiente
4. Inserta registro en `user_roles`
5. Solo ADMIN puede registrar nuevos usuarios (validacion por token)

Nota: No se usara auto-confirm de email. Los usuarios deberan verificar su correo.

---

### Paso 3: Frontend - Pagina de Login

Crear `src/pages/Login.tsx`:
- Formulario con email y password
- Usa `supabase.auth.signInWithPassword()`
- Muestra errores de validacion
- Redirige segun rol despues del login

---

### Paso 4: Frontend - Contexto de Autenticacion

Crear `src/contexts/AuthContext.tsx`:
- Provider que envuelve la app
- Escucha `onAuthStateChange` para manejar sesion
- Consulta el rol del usuario desde `usuarios` (via `auth_id`)
- Expone: `user`, `role`, `loading`, `signOut`

---

### Paso 5: Frontend - Proteccion de Rutas

Crear `src/components/ProtectedRoute.tsx`:
- Verifica sesion activa, redirige a `/login` si no hay
- Verifica que el rol coincida con los permitidos
- Muestra pantalla de "no autorizado" si el rol no coincide

---

### Paso 6: Frontend - Paneles por Rol

Crear 3 paginas dashboard:

- `src/pages/AdminDashboard.tsx`: Vista general con todas las tablas, gestion de usuarios
- `src/pages/SocioDashboard.tsx`: Lista de proyectos propios + formulario crear/editar proyecto
- `src/pages/BecarioDashboard.tsx`: Panel de check-in (placeholder por ahora)

---

### Paso 7: Frontend - CRUD Proyectos (SOCIO/ADMIN)

Dentro del dashboard de SOCIO:
- Formulario para crear proyecto (nombre, descripcion, fechas, cupo_total)
- Lista de proyectos filtrada por `socio_usuario_id` que coincida con el usuario autenticado
- Boton editar (solo descripcion para SOCIO; ADMIN puede editar todo)
- Validacion: cupo_total >= 1, fechas validas

Se usara directamente el cliente de la base de datos (no edge function) ya que las politicas RLS protegen el acceso.

---

### Paso 8: Actualizar Rutas en App.tsx

```text
/login          -> Login (publica)
/               -> Redirige segun rol
/admin          -> AdminDashboard (solo ADMIN)
/socio          -> SocioDashboard (solo SOCIO)
/checkin        -> BecarioDashboard (solo BECARIO)
```

---

### Paso 9: Seed - Crear Usuarios de Prueba en Auth

Usar la edge function `register-user` o insertar directamente datos de prueba para que los 3 usuarios existentes (ADMIN, SOCIO, BECARIO) tengan cuentas de Auth vinculadas.

---

### Archivos que se crearan o modificaran

| Archivo | Accion |
|---------|--------|
| `supabase/migrations/nueva_migracion.sql` | Crear (via herramienta de migracion) |
| `supabase/functions/register-user/index.ts` | Crear |
| `supabase/config.toml` | Auto-actualizado |
| `src/contexts/AuthContext.tsx` | Crear |
| `src/components/ProtectedRoute.tsx` | Crear |
| `src/pages/Login.tsx` | Crear |
| `src/pages/AdminDashboard.tsx` | Crear |
| `src/pages/SocioDashboard.tsx` | Crear |
| `src/pages/BecarioDashboard.tsx` | Crear |
| `src/App.tsx` | Modificar (agregar rutas y AuthProvider) |
| `src/pages/Index.tsx` | Modificar (redirigir segun sesion) |

### Lo que NO se modifica

- No se eliminan migraciones existentes
- No se cambia la estructura de las 7 tablas originales
- No se modifica `client.ts`, `types.ts`, ni `.env`

