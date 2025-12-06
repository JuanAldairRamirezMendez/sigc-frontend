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
      .get(`/horarios/doctor/${idDoctor}`)
      .then((res) => {
        const datos = Array.isArray(res.data) ? res.data : [];
        // Los horarios ya vienen filtrados por doctor y disponibilidad del backend
        setHorarios(datos);
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

      // Encontrar el horario seleccionado para obtener la fecha y doctor
      const horarioSeleccionado = horarios.find(h => h.idHorario === idHorario);
      if (!horarioSeleccionado) {
        showError("Horario no encontrado");
        return;
      }

      const requestData = {
        date: horarioSeleccionado.fecha,
        description: `Cita con ${doctores.find(d => d.idDoctor === doctorSeleccionado)?.nombre || 'Doctor'}`,
        doctorId: doctorSeleccionado
      };

      const response = await api.post("/citas", requestData, {
        headers: {
          Authorization: `Bearer ${usuarioGuardado.token}`
        }
      });

      showSuccess("Cita reservada exitosamente", "¡Éxito!");
      // Recargar horarios para actualizar disponibilidad
      cargarHorarios(doctorSeleccionado);

    } catch (error) {
      console.error("Error al reservar cita:", error);
      showError("Ocurrió un error al intentar reservar la cita.");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Doctores de {idEspecialidad}</h2>

      {/* Doctores */}
      <div className="row justify-content-center">
        {doctores.map((doc) => (
          <div
            key={doc.idDoctor}
            className="col-md-4 mb-4"
          >
            <div
              className={`card h-100 shadow-sm border-0 ${
                doctorSeleccionado === doc.idDoctor
                  ? "border-success shadow"
                  : ""
              }`}
              onClick={() => cargarHorarios(doc.idDoctor)}
              style={{ cursor: "pointer" }}
            >
              <img
                src={
                  doc.imagen
                    ? `${API_URL}/doctores/imagen/${doc.imagen}`
                    : "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=250&fit=crop&crop=center"
                }
                alt={doc.nombre}
                className="card-img-top"
                style={{
                  objectFit: "cover",
                  height: "230px",
                  borderTopLeftRadius: "10px",
                  borderTopRightRadius: "10px",
                }}
                onError={(e) => (e.target.src = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=250&fit=crop&crop=center")}
              />
              <div className="card-body text-center">
                <h5 className="fw-bold text-green-700">{doc.nombre}</h5>
                <p className="text-muted small">{doc.especialidad}</p>
                <p className="text-secondary small">
                  Cupo disponible: {doc.cupoPacientes}
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    cargarHorarios(doc.idDoctor);
                  }}
                >
                  Ver Horarios
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Horarios del doctor seleccionado */}
      {doctorSeleccionado && (
        <div className="mt-5">
          <h3 className="mb-3">
            Horarios disponibles de {doctores.find(d => d.idDoctor === doctorSeleccionado)?.nombre}
          </h3>

          {horarios.length === 0 ? (
            <div className="alert alert-info">
              No hay horarios disponibles para este doctor.
            </div>
          ) : (
            <div className="row">
              {horarios.map((horario) => (
                <div key={horario.idHorario} className="col-md-3 mb-3">
                  <div className="card">
                    <div className="card-body text-center">
                      <h6 className="card-title">
                        {new Date(horario.fecha).toLocaleDateString()}
                      </h6>
                      <p className="card-text">
                        {horario.horaInicio} - {horario.horaFin}
                      </p>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => reservarCita(horario.idHorario)}
                        disabled={loading}
                      >
                        {loading ? "Reservando..." : "Reservar Cita"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
