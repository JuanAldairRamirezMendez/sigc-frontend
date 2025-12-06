import axios from "axios";
import { mockApi } from "./mockApi";

// Leer la URL base desde la variable de entorno
// Si no existe, usa http://localhost:8080 como fallback
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Configuración para uso selectivo del backend real
const USE_REAL_BACKEND = {
  specialties: import.meta.env.VITE_USE_MOCK_FOR_SPECIALTIES !== 'true',
  doctors: import.meta.env.VITE_USE_MOCK_FOR_DOCTORS !== 'true',
  auth: !import.meta.env.VITE_USE_MOCK_FOR_AUTH === 'true',
  appointments: !import.meta.env.VITE_USE_MOCK_FOR_APPOINTMENTS === 'true',
  schedules: !import.meta.env.VITE_USE_MOCK_FOR_SCHEDULES === 'true'
};

// Variable global USE_MOCK_API para compatibilidad con código existente (DEPRECATED - usar USE_REAL_BACKEND en su lugar)
const USE_MOCK_API = false;

console.log("🔗 API URL configurada:", API_URL);
console.log("⚙️ Configuración backend/mock:", USE_REAL_BACKEND);

// Funciones para normalizar datos del backend
const normalizarEspecialidades = (especialidades) => {
  if (!Array.isArray(especialidades)) {
    console.warn("⚠️ Especialidades no es un array:", especialidades);
    return [];
  }
  
  return especialidades.map((esp, index) => {
    const idEspecialidad = esp.idEspecialidad || esp.id || esp.especialidadId || index;
    const nombre = esp.nombre || esp.name || "Sin nombre";
    const descripcion = esp.descripcion || esp.description || "";
    
    return {
      idEspecialidad: idEspecialidad,
      id: idEspecialidad, // Compatibilidad
      nombre: nombre,
      name: nombre, // Compatibilidad
      descripcion: descripcion,
      description: descripcion, // Compatibilidad
      imagen: esp.imagen || null
    };
  });
};

const normalizarDoctores = (doctores) => {
  // Manejar si la respuesta no es un array
  if (!Array.isArray(doctores)) {
    console.warn("⚠️ Respuesta no es un array:", doctores);
    return [];
  }
  
  return doctores.map((doc, index) => {
    // Manejar diferentes estructuras del backend
    const idDoctor = doc.idDoctor || doc.id || doc.doctorId || index;
    const nombre = doc.nombre || doc.name || "Sin nombre";
    const especialidad = typeof doc.especialidad === 'object' 
      ? doc.especialidad.nombre || doc.especialidad 
      : doc.especialidad || "Sin especialidad";
    const cupoPacientes = doc.cupoPacientes || doc.cupo || 0;
    
    return {
      idDoctor: idDoctor,
      id: idDoctor, // Compatibilidad
      nombre: nombre,
      name: nombre, // Compatibilidad
      especialidad: especialidad,
      cupoPacientes: cupoPacientes,
      imagen: doc.imagen || null,
      // Campos opcionales
      correo: doc.correo || null,
      telefono: doc.telefono || null
    };
  });
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased from 10000 to 30000 for Render cold starts
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token automáticamente a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const usuario = localStorage.getItem("usuario");
    
    if (usuario) {
      try {
        const user = JSON.parse(usuario);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (e) {
        console.error("Error al parsear usuario del localStorage:", e);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores 401 (token expirado/inválido)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Solo limpiar y redirigir si NO estamos en rutas públicas
      const rutasPublicas = ['/login', '/registrar', '/especialidades', '/turnos'];
      const rutaActual = window.location.pathname;
      
      const esRutaPublica = rutasPublicas.some(ruta => rutaActual.startsWith(ruta));
      
      if (!esRutaPublica) {
        console.warn("⚠️ Token expirado o inválido. Redirigiendo al login...");
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Funciones API con fallback automático a mock
export const authAPI = {
  login: async (credentials) => {
    if (USE_MOCK_API) {
      return { data: await mockApi.login(credentials) };
    }
    
    try {
      const response = await api.post('/auth/login', credentials);
      return response;
    } catch (error) {
      console.log("🎭 Fallback a mock API para login (error:", error.message, ")");
      const mockData = await mockApi.login(credentials);
      return { data: mockData };
    }
  },

  register: async (userData) => {
    if (USE_MOCK_API) {
      return { data: await mockApi.register(userData) };
    }
    
    try {
      const response = await api.post('/auth/register', userData);
      return response;
      // eslint-disable-next-line no-unused-vars
    } catch (_error) {
      console.log("🎭 Fallback a mock API para registro");
      const mockData = await mockApi.register(userData);
      return { data: mockData };
    }
  },

  getProfile: async () => {
    if (USE_MOCK_API) {
      // Mock profile basado en token almacenado
      const usuario = localStorage.getItem("usuario");
      if (usuario) {
        return { data: JSON.parse(usuario) };
      }
      throw new Error('No autenticado');
    }
    
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      if (error.useMock || error.code === 'ERR_NETWORK') {
        const usuario = localStorage.getItem("usuario");
        if (usuario) {
          return { data: JSON.parse(usuario) };
        }
      }
      throw error;
    }
  }
};

export const especialidadesAPI = {
  getAll: async () => {
    // Usar backend real si está configurado, sino usar mock
    if (USE_REAL_BACKEND.specialties) {
      try {
        const response = await api.get('/especialidades');
        // Normalizar datos del backend para el frontend
        const especialidadesNormalizadas = normalizarEspecialidades(response.data);
        console.log("✅ Especialidades obtenidas del backend:", especialidadesNormalizadas);
        return especialidadesNormalizadas;
      } catch (error) {
        console.error("❌ Error obteniendo especialidades del backend, usando mock:", error.message);
        return mockApi.getEspecialidades();
      }
    }
    
    // Usar mock API
    return mockApi.getEspecialidades();
  }
};

export const doctoresAPI = {
  getAll: async () => {
    // Usar backend real si está configurado, sino usar mock
    if (USE_REAL_BACKEND.doctors) {
      try {
        const response = await api.get('/doctores');
        // Normalizar datos del backend para el frontend
        const doctoresNormalizados = normalizarDoctores(response.data);
        console.log("✅ Doctores obtenidos del backend:", doctoresNormalizados);
        return doctoresNormalizados;
      } catch (error) {
        console.error("❌ Error obteniendo doctores del backend, usando mock:", error.message);
        return mockApi.getDoctores();
      }
    }
    
    // Usar mock API
    return mockApi.getDoctores();
  },

  create: async (doctorData) => {
    if (!USE_REAL_BACKEND.doctors) {
      return mockApi.createDoctor ? mockApi.createDoctor(doctorData) : { success: true, data: doctorData };
    }

    try {
      console.log("📝 Creando doctor:", doctorData);
      const response = await api.post('/doctores/json', doctorData);
      console.log("✅ Doctor creado exitosamente:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error creando doctor:", error.response?.data || error.message);
      throw error;
    }
  },

  update: async (doctorId, doctorData) => {
    if (!USE_REAL_BACKEND.doctors) {
      return mockApi.updateDoctor ? mockApi.updateDoctor(doctorId, doctorData) : { success: true, data: doctorData };
    }

    try {
      console.log("✏️ Actualizando doctor ID:", doctorId, "con datos:", doctorData);
      // Intentar primero el endpoint sin /json
      const response = await api.put(`/doctores/${doctorId}`, doctorData);
      console.log("✅ Doctor actualizado exitosamente:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error actualizando doctor:", error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (doctorId) => {
    if (!USE_REAL_BACKEND.doctors) {
      return mockApi.deleteDoctor ? mockApi.deleteDoctor(doctorId) : { success: true };
    }

    try {
      console.log("🗑️ Eliminando doctor ID:", doctorId);
      const response = await api.delete(`/doctores/${doctorId}`);
      console.log("✅ Doctor eliminado exitosamente");
      return response.data;
    } catch (error) {
      console.error("❌ Error eliminando doctor:", error.response?.data || error.message);
      throw error;
    }
  },

  getByEspecialidad: async (especialidadId) => {
    // Usar backend real si está configurado
    if (USE_REAL_BACKEND.doctors) {
      try {
        const response = await api.get(`/doctores/especialidad/${especialidadId}`);
        const doctoresNormalizados = normalizarDoctores(response.data);
        console.log("✅ Doctores por especialidad obtenidos del backend:", doctoresNormalizados);
        return doctoresNormalizados;
      } catch (error) {
        console.error("❌ Error obteniendo doctores por especialidad del backend, usando mock:", error.message);
        return mockApi.getDoctoresByEspecialidad(especialidadId);
      }
    }
    
    // Usar mock API
    return mockApi.getDoctoresByEspecialidad(especialidadId);
  }
};

export const citasAPI = {
  create: async (citaData) => {
    if (USE_MOCK_API) {
      return mockApi.createCita(citaData);
    }
    
    try {
      const response = await api.post('/citas', citaData);
      return response.data;
    } catch (error) {
      if (error.useMock || error.code === 'ERR_NETWORK') {
        console.log("🎭 Fallback a mock API para crear cita");
        return mockApi.createCita(citaData);
      }
      throw error;
    }
  },

  getByUsuario: async (usuarioId) => {
    if (USE_MOCK_API) {
      return mockApi.getCitasUsuario(usuarioId);
    }
    
    try {
      const response = await api.get(`/citas/usuario/${usuarioId}`);
      return response.data;
    } catch (error) {
      if (error.useMock || error.code === 'ERR_NETWORK') {
        console.log("🎭 Fallback a mock API para citas del usuario");
        return mockApi.getCitasUsuario(usuarioId);
      }
      throw error;
    }
  },

  cancel: async (citaId) => {
    if (USE_MOCK_API) {
      return mockApi.cancelarCita(citaId);
    }
    
    try {
      const response = await api.put(`/citas/${citaId}/cancelar`);
      return response.data;
    } catch (error) {
      if (error.useMock || error.code === 'ERR_NETWORK') {
        console.log("🎭 Fallback a mock API para cancelar cita");
        return mockApi.cancelarCita(citaId);
      }
      throw error;
    }
  }
};

export const horariosAPI = {
  getByDoctor: async (doctorId, fecha) => {
    if (USE_MOCK_API) {
      return mockApi.getHorarios(doctorId, fecha);
    }
    
    try {
      const response = await api.get(`/horarios/doctor/${doctorId}/fecha/${fecha}`);
      return response.data;
    } catch (error) {
      if (error.useMock || error.code === 'ERR_NETWORK') {
        console.log("🎭 Fallback a mock API para horarios");
        return mockApi.getHorarios(doctorId, fecha);
      }
      throw error;
    }
  }
};

export { API_URL };
export default api;
