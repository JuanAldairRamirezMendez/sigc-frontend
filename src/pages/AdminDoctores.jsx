import { useEffect, useState } from "react";
import { doctoresAPI, especialidadesAPI } from "../services/api";
import api, { API_URL } from "../services/api";
import AdminLayout from "../layouts/AdminLayout";
import "../styles/AdminDoctores.css";

export default function AdminDoctores() {
  const [doctores, setDoctores] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [cupoPacientes, setCupoPacientes] = useState("");
  const [imagenUrl, setImagenUrl] = useState(""); // URL o base64
  const [imagenNombre, setImagenNombre] = useState(""); // Solo el nombre para mostrar
  const [modoEdicion, setModoEdicion] = useState(false);
  const [doctorEditando, setDoctorEditando] = useState(null);
  const [imagenesError, setImagenesError] = useState(new Set());

  const obtenerInitiales = (nombre) => {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(n => n.charAt(0).toUpperCase())
      .join('');
  };

  const obtenerColorAvatar = (nombre) => {
    const colores = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
    const index = nombre.charCodeAt(0) % colores.length;
    return colores[index];
  };

  const generarAvatarSVG = (nombre) => {
    const iniciales = obtenerInitiales(nombre);
    const color = obtenerColorAvatar(nombre);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="250" viewBox="0 0 200 250">
        <rect width="200" height="250" fill="${color}"/>
        <text x="100" y="140" font-size="60" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">
          ${iniciales}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Subir imagen al backend
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP)");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5MB");
      e.target.value = "";
      return;
    }

    // En mock mode, usar base64
    if (import.meta.env.VITE_USE_MOCK_FOR_DOCTORS === 'true') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setImagenUrl(base64); // Guardar como base64 (sin mostrar)
        setImagenNombre(file.name); // Mostrar solo el nombre
        console.log("✅ Imagen cargada en memoria (mock):", file.name);
      };
      reader.readAsDataURL(file);
      return;
    }

    // En modo real, subir al servidor
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await api.post("/uploads", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imageUrl = res.data.url; // Por ejemplo: "/images/doctores/xxxx.jpg"
      const fileName = imageUrl.split("/").pop();
      setImagenUrl(fileName); // Guardar solo el nombre
      setImagenNombre(fileName); // Mostrar el nombre
      console.log("✅ Imagen subida exitosamente:", imageUrl);
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      alert(`Error al subir imagen: ${errorMsg}`);
    }
  };

  useEffect(() => {
    cargarDoctores();
    cargarEspecialidades();
  }, []);

  const cargarDoctores = async () => {
    try {
      const doctoresData = await doctoresAPI.getAll();
      console.log("👨‍⚕️ Doctores cargados:", doctoresData);
      setDoctores(Array.isArray(doctoresData) ? doctoresData : []);
    } catch (error) {
      console.error("❌ Error cargando doctores:", error);
      setDoctores([]);
    }
  };

  const cargarEspecialidades = async () => {
    try {
      const especialidadesData = await especialidadesAPI.getAll();
      console.log("🏥 Especialidades cargadas:", especialidadesData);
      setEspecialidades(Array.isArray(especialidadesData) ? especialidadesData : []);
    } catch (error) {
      console.error("❌ Error cargando especialidades:", error);
      setEspecialidades([]);
    }
  };

  const handleRegistrarOEditar = async (e) => {
    e.preventDefault();

    if (!nombre || !especialidad || !cupoPacientes) {
      alert("Por favor completa todos los campos");
      return;
    }

    // Estructura que espera el backend
    const doctorData = {
      nombre: nombre.trim(),
      especialidad: especialidad,
      cupoPacientes: parseInt(cupoPacientes)
    };

    // Solo agregar imagen si existe
    if (imagenUrl) {
      doctorData.imagen = imagenUrl;
    }

    try {
      if (modoEdicion) {
        console.log("✏️ Editando doctor:", doctorEditando, doctorData);
        await doctoresAPI.update(doctorEditando, doctorData);
        alert("✅ Doctor actualizado correctamente");
        setModoEdicion(false);
        setDoctorEditando(null);
      } else {
        console.log("📝 Registrando doctor:", doctorData);
        await doctoresAPI.create(doctorData);
        alert("✅ Doctor registrado correctamente");
      }
      
      // Limpiar formulario
      setNombre("");
      setEspecialidad("");
      setCupoPacientes("");
      setImagenUrl("");
      setImagenNombre("");
      cargarDoctores();
    } catch (error) {
      console.error("❌ Error guardando doctor:", error.response?.data || error.message);
      alert(`Error al guardar el doctor: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Eliminar este doctor?")) {
      try {
        console.log("🗑️ Eliminando doctor ID:", id);
        await doctoresAPI.delete(id);
        // Actualizar estado local inmediatamente
        setDoctores(doctores.filter(d => d.idDoctor !== id));
        alert("✅ Doctor eliminado correctamente");
      } catch (error) {
        console.error("❌ Error eliminando doctor:", error.response?.data || error.message);
        alert(`Error al eliminar doctor: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleEditar = (doctor) => {
    console.log("✏️ Editando doctor:", doctor);
    setModoEdicion(true);
    setDoctorEditando(doctor.idDoctor);
    setNombre(doctor.nombre);
    setEspecialidad(doctor.especialidad);
    setCupoPacientes(doctor.cupoPacientes || "");
    setImagenUrl(doctor.imagen || "");
    // Si es base64, extraer nombre (aunque sea largo), si no, mostrar el nombre del archivo
    if (doctor.imagen && doctor.imagen.startsWith('data:')) {
      setImagenNombre("[Imagen cargada]");
    } else {
      setImagenNombre(doctor.imagen ? doctor.imagen.split('/').pop() : "");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelar = () => {
    setModoEdicion(false);
    setDoctorEditando(null);
    setNombre("");
    setEspecialidad("");
    setCupoPacientes("");
    setImagenUrl("");
    setImagenNombre("");
  };

  return (
    <AdminLayout>
      <div className="admin-doctores-container">
        <h1 className="titulo-admin">Gestión de Doctores</h1>

        <form className="form-doctor" onSubmit={handleRegistrarOEditar} encType="multipart/form-data">
          <input
            type="text"
            placeholder="Nombre del doctor"
            value={nombre || ""}
            onChange={(e) => setNombre(e.target.value)}
          />
          <select
            value={especialidad || ""}
            onChange={(e) => setEspecialidad(e.target.value)}
          >
            <option value="">Seleccionar especialidad</option>
            {especialidades.map((esp) => (
              <option key={esp.idEspecialidad} value={esp.nombre}>
                {esp.nombre}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Cupo"
            value={cupoPacientes || ""}
            onChange={(e) => setCupoPacientes(e.target.value)}
          />
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
              Imagen del Doctor:
            </label>
            <input 
              type="file" 
              onChange={handleFileUpload}
              accept="image/*"
            />
            {imagenNombre && (
              <p style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                ✅ Imagen: {imagenNombre}
              </p>
            )}
          </div>
          <button type="submit" className={modoEdicion ? "btn-actualizar" : ""}>
            {modoEdicion ? "Actualizar" : "Registrar"}
          </button>
          {modoEdicion && (
            <button
              type="button"
              onClick={handleCancelar}
              className="btn-cancelar"
            >
              Cancelar
            </button>
          )}
        </form>
        <div className="cards-container">
          {doctores.map((doc) => {
            const usarMock = import.meta.env.VITE_USE_MOCK_FOR_DOCTORS === 'true';
            
            // Si la imagen es base64 (comienza con 'data:'), usarla directamente
            let imagenUrl = null;
            if (doc.imagen) {
              if (doc.imagen.startsWith('data:')) {
                imagenUrl = doc.imagen; // Es base64
              } else if (!usarMock) {
                imagenUrl = `${API_URL}/doctores/imagen/${doc.imagen}`;
              }
            }
            
            const mostrarImagenReal = imagenUrl && !imagenesError.has(doc.idDoctor);
            const imagenFallback = generarAvatarSVG(doc.nombre);
            
            return (
            <div key={doc.idDoctor} className="card-doctor">
              <img
                src={mostrarImagenReal ? imagenUrl : imagenFallback}
                alt={doc.nombre}
                className="doctor-img"
                onError={() => {
                  setImagenesError(prev => new Set(prev).add(doc.idDoctor));
                }}
              />
              <h3>{doc.nombre}</h3>
              <p>
                <strong>Especialidad:</strong> {doc.especialidad}
              </p>
              <p>
                <strong>Cupo:</strong> {doc.cupoPacientes} pacientes
              </p>
              <div className="acciones">
                <button
                  className="btn-editar"
                  onClick={() => handleEditar(doc)}
                >
                  Editar
                </button>
                <button
                  className="btn-eliminar"
                  onClick={() => handleEliminar(doc.idDoctor)}
                >
                  Eliminar
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
