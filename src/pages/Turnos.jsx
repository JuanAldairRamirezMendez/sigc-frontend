import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import ClienteLayout from "../layouts/ClienteLayout";
import api, { API_URL } from "../services/api";
import { showSuccess, showWarning, showError, showConfirm } from "../utils/alerts";

export default function Turnos() {
  const { idEspecialidad } = useParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [doctores, setDoctores] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [doctorSeleccionado, setDoctorSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(false);

  // 🩺 Cargar doctores filtrados por especialidad
  useEffect(() => {
    // Verificar si el usuario está autenticado
    const usuario = localStorage.getItem("usuario");
    setIsAuthenticated(!!usuario);

    setCargando(true);
    api
      .get("/doctores")
      .then((res) => {
        const datos = Array.isArray(res.data) ? res.data : [];
        const filtrados = datos.filter(
          (d) =>
            d.especialidad.toLowerCase().trim() ===
            idEspecialidad.toLowerCase().trim()
        );
        setDoctores(filtrados);
      })
      .catch((error) => {
        console.error("Error al cargar doctores:", error);
        setDoctores([]);
      })
      .finally(() => setCargando(false));
  }, [idEspecialidad]);

  // 🕓 Cargar horarios de un doctor
  const cargarHorarios = (idDoctor) => {
    setDoctorSeleccionado(idDoctor);
    setCargando(true);
    api
      .get("/horarios")
      .then((res) => {
        const datos = Array.isArray(res.data) ? res.data : [];
        const horariosFiltrados = datos.filter(
          (h) => h.doctor?.idDoctor === idDoctor && h.disponible
        );
        setHorarios(horariosFiltrados);
      })
      .catch((error) => {
        console.error("Error al cargar horarios:", error);
        setHorarios([]);
      })
      .finally(() => setCargando(false));
  };

  // 📅 Reservar cita
  const reservarCita = async (idHorario) => {
    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado || !usuarioGuardado.token) {
        showWarning("Debes iniciar sesión para agendar una cita.", "Sesión requerida");
        navigate("/login");
        return;
      }

      const resUsuario = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${usuarioGuardado.token}`
        }
      });

      const usuario = resUsuario.data;
      // Aquí seguiría tu lógica para agendar cita usando el usuario
    } catch (error) {
      showError("Ocurrió un error al intentar reservar la cita.");
    }
  };

  return (
    <div className="row justify-content-center">
      {doctores.map((doc) => (
        <div
          key={doc.idDoctor}
          className="col-md-4 mb-4"
          onClick={() => cargarHorarios(doc.idDoctor)}
          style={{ cursor: "pointer" }}
        >
          <div
            className={`card h-100 shadow-sm border-0 ${
              doctorSeleccionado === doc.idDoctor
                ? "border-success shadow"
                : ""
            }`}
          >
            <img
              src={
                doc.imagen
                  ? `${API_URL}/doctores/imagen/${doc.imagen}`
                  : "https://picsum.photos/200/250?random=1"
              }
              alt={doc.nombre}
              className="card-img-top"
              style={{
                objectFit: "cover",
                height: "230px",
                borderTopLeftRadius: "10px",
                borderTopRightRadius: "10px",
              }}
              onError={(e) => (e.target.src = "https://picsum.photos/200/250?random=2")}
            />
            <div className="card-body text-center">
              <h5 className="fw-bold text-green-700">{doc.nombre}</h5>
              <p className="text-muted small">{doc.especialidad}</p>
              <p className="text-secondary small">
                Cantidad disponible: {doc.cupoPacientes}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
