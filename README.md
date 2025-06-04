# Constructinini

## Instrucciones para ejecutar el proyecto

### 1. Requisitos

- **Node.js** (versión recomendada: 18.x o superior)
- **npm** (v9.x o superior, viene con Node.js)
- Acceso a internet (el proyecto usa Supabase como backend)

### 2. Instalación

1. **Clona o descarga el repositorio** en tu máquina.
2. Abre una terminal y navega a la carpeta del proyecto:
   ```sh
   cd "Constructiniii (1)"
   ```
3. **Instala las dependencias**:
   ```sh
   npm install
   ```

### 3. Ejecución en modo desarrollo

Para iniciar el servidor de desarrollo:
```sh
npm run dev
```
Esto levantará la aplicación usando Vite. Normalmente, la app estará disponible en [http://localhost:5173](http://localhost:5173) (la terminal te mostrará la URL exacta).

### 4. Compilar para producción

Si quieres generar los archivos listos para producción:
```sh
npm run build
```
Y para previsualizar el build:
```sh
npm run preview
```

### 5. Base de datos

- El proyecto utiliza **Supabase** como backend (Base de datos y autenticación).
- Ya está configurado para conectarse a un proyecto Supabase específico (ver `src/lib/supabaseClient.js`).
- **No necesitas instalar ni configurar una base de datos localmente**.
- Si quieres usar tu propio proyecto de Supabase, reemplaza las variables `supabaseUrl` y `supabaseAnonKey` en `src/lib/supabaseClient.js` por las de tu proyecto.

### 6. Configuración de la Base de Datos en Supabase

Para crear tu propia base de datos en Supabase:

1. **Crear una cuenta en Supabase**:
   - Ve a [https://supabase.com](https://supabase.com)
   - Regístrate o inicia sesión
   - Crea un nuevo proyecto

2. **Configurar la base de datos**:
   - En tu proyecto de Supabase, ve a la sección "SQL Editor"
   - Copia y pega el siguiente script SQL:

```sql
-- Crear las tablas principales

-- Tabla de perfiles de usuario
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'manager', 'worker')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de proyectos
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    radius INTEGER DEFAULT 100,
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tareas
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de asignaciones de proyecto
CREATE TABLE project_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('manager', 'worker')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- Tabla de comentarios de tareas
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de fotos de tareas
CREATE TABLE tasks_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de asistencia
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de fotos de asistencia
CREATE TABLE attendance_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tipos de recursos
CREATE TABLE resource_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de solicitudes de recursos
CREATE TABLE resource_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de items de solicitud de recursos
CREATE TABLE resource_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES resource_requests(id) ON DELETE CASCADE,
    resource_type_id UUID REFERENCES resource_types(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_project_id ON attendance(project_id);
CREATE INDEX idx_resource_requests_project_id ON resource_requests(project_id);
CREATE INDEX idx_resource_request_items_request_id ON resource_request_items(request_id);

-- Crear función para actualizar el timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar automáticamente updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_requests_updated_at
    BEFORE UPDATE ON resource_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

3. **Configurar las credenciales**:
   - En tu proyecto de Supabase, ve a "Project Settings" > "API"
   - Copia la "Project URL" y la "anon public" key
   - Reemplaza estas credenciales en el archivo `src/lib/supabaseClient.js`:
   ```javascript
   const supabaseUrl = 'TU_PROJECT_URL';
   const supabaseAnonKey = 'TU_ANON_KEY';
   ```

4. **Configurar el almacenamiento**:
   - En Supabase, ve a "Storage"
   - Crea los siguientes buckets:
     - `tasks_photos`
     - `attendance_photos`
   - Configura las políticas de acceso según tus necesidades

### 7. Cuentas de Prueba

El sistema incluye tres tipos de usuarios con diferentes niveles de acceso:

1. **Administrador**
   - Email: admin1@example.com
   - Contraseña: password123
   - Funcionalidades:
     - Gestión completa de usuarios
     - Configuración del sistema
     - Aprobación de solicitudes de recursos
     - Acceso a todas las funcionalidades

2. **Project Manager**
   - Email: tomasmejiag2@gmail.com
   - Contraseña: password123
   - Funcionalidades:
     - Crear y gestionar proyectos
     - Asignar trabajadores a proyectos
     - Crear y asignar tareas
     - Ver reportes de asistencia
     - Solicitar recursos

3. **Trabajador**
   - Email: worker1@example.com
   - Contraseña: password123
   - Funcionalidades:
     - Ver tareas asignadas
     - Marcar asistencia
     - Subir fotos de progreso
     - Comentar en tareas
     - Ver proyectos asignados

### Explicación de los comandos de construcción

#### `npm run build`
Este comando compila tu aplicación para producción:
- Optimiza el código (minifica JavaScript y CSS)
- Elimina código no utilizado
- Comprime las imágenes y otros recursos
- Genera archivos optimizados en la carpeta `dist`

#### `npm run preview`
Este comando te permite previsualizar la versión de producción localmente:
- Sirve los archivos de la carpeta `dist`
- Muestra exactamente cómo se verá tu aplicación en producción
- Te permite probar la versión optimizada antes de subirla a un servidor real

### ¿Cuándo usar estos comandos?

- **Durante desarrollo**: Usa `npm run dev` para trabajar en tu aplicación
- **Antes de desplegar**: 
  1. Ejecuta `npm run build` para crear la versión optimizada
  2. Usa `npm run preview` para verificar que todo funciona
  3. Sube la carpeta `dist` a tu servidor web