import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import { es } from "date-fns/locale";
import { format, addDays, isWeekend } from "date-fns";
import PublicLayout from "../layouts/PublicLayout";
import ClienteLayout from "../layouts/ClienteLayout";
import { CardSkeleton, LoadingSpinner, EmptyState, ButtonLoading } from "../components/loading/LoadingComponents";
import { SectionErrorBoundary } from "../components/loading/ErrorBoundaries";
import { useAsyncOperation, useFormSubmit } from "../hooks/useAsyncOperations";
import api, { API_URL } from "../services/api";
import { showSuccess, showWarning, showError } from "../utils/alerts";

import "react-datepicker/dist/react-datepicker.css";

export default function TurnosMejorado() {
  const { idEspecialidad } = useParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Estados del flujo
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHorario, setSelectedHorario] = useState(null);

  // Async operations
  const { 
    loading: doctorsLoading, 
    data: doctores, 
    execute: fetchDoctores 
  } = useAsyncOperation();
  
  const { 
    loading: horariosLoading, 
    data: horarios, 
    execute: fetchHorarios 
  } = useAsyncOperation();

  const { isSubmitting, handleSubmit: submitCita } = useFormSubmit();

  const loadDoctores = useCallback(async () => {
    try {
      await fetchDoctores(async () => {
        const res = await api.get("/doctores");
        const datos = Array.isArray(res.data) ? res.data : [];
        return datos.filter(
          (d) =>
            d.especialidad.toLowerCase().trim() ===
            idEspecialidad.toLowerCase().trim()
        );
      });
    } catch (error) {
      console.error("Error al cargar doctores:", error);
      showError("No se pudieron cargar los doctores disponibles");
    }
  }, [idEspecialidad, fetchDoctores]);

  // 🩺 Cargar doctores filtrados por especialidad
  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    setIsAuthenticated(!!usuario);
    loadDoctores();
  }, [loadDoctores]);

  // 🕓 Cargar horarios disponibles del doctor seleccionado
  const cargarHorarios = async (doctor, fecha = null) => {
    try {
      await fetchHorarios(async () => {
        const res = await api.get("/horarios");
        const datos = Array.isArray(res.data) ? res.data : [];
        
        let horariosFiltrados = datos.filter(
          (h) => h.doctor?.idDoctor === doctor.idDoctor && h.disponible
        );

        // Si hay fecha seleccionada, filtrar por fecha
        if (fecha) {
          const fechaStr = format(fecha, "yyyy-MM-dd");
          horariosFiltrados = horariosFiltrados.filter(
            (h) => h.fecha === fechaStr
          );
        }

        return horariosFiltrados;
      });
    } catch (error) {
      console.error("Error al cargar horarios:", error);
      showError("No se pudieron cargar los horarios disponibles");
    }
  };

  // 📅 Reservar cita
  const reservarCita = async () => {
    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado || !usuarioGuardado.token) {
        showWarning("Debes iniciar sesión para agendar una cita.", "Sesión requerida");
        navigate("/login");
        return;
      }

      // Obtener datos actuales del usuario
      const resUsuario = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${usuarioGuardado.token}`
        }
      });

      const usuario = resUsuario.data;

      // Datos de la cita
      const citaData = {
        usuarioId: usuario.idUsuario,
        doctorId: selectedDoctor.idDoctor,
        horarioId: selectedHorario.idHorario,
        fechaCita: format(selectedDate, "yyyy-MM-dd"),
        horaCita: selectedHorario.horaInicio,
        estado: "ACTIVA"
      };

      await submitCita(async () => {
        await api.post("/citas", citaData, {
          headers: {
            Authorization: `Bearer ${usuarioGuardado.token}`
          }
        });
      });

      // Éxito
      showSuccess(
        `Tu cita ha sido agendada para el ${format(selectedDate, "dd/MM/yyyy")} a las ${selectedHorario.horaInicio}`,
        "¡Cita Confirmada!"
      );
      
      navigate("/cita-confirmada");

    } catch (error) {
      console.error("Error al reservar cita:", error);
      const mensaje = error.response?.data?.message || "Error al agendar la cita";
      showError(mensaje);
    }
  };

  // Navegación entre pasos
  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const selectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedDate(null);
    setSelectedHorario(null);
    nextStep();
  };

  const selectDate = (date) => {
    setSelectedDate(date);
    setSelectedHorario(null);
    cargarHorarios(selectedDoctor, date);
    nextStep();
  };

  const selectHorario = (horario) => {
    setSelectedHorario(horario);
    nextStep();
  };

  // Filtrar fechas disponibles (no weekends, no pasadas)
  const filterDate = (date) => {
    const today = new Date();
    const maxDate = addDays(today, 30); // 30 días en adelante
    return date >= today && date <= maxDate && !isWeekend(date);
  };

  const Layout = isAuthenticated ? ClienteLayout : PublicLayout;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Selección de Doctor
        return (
          <div>
            <h3 className="text-center mb-4">
              <i className="fas fa-user-md me-2 text-success"></i>
              Selecciona un Doctor
            </h3>
            
            {doctorsLoading ? (
              <CardSkeleton count={3} />
            ) : (
              <div className="row g-3">
                {doctores?.map((doc) => (
                  <div key={doc.idDoctor} className="col-md-6 col-lg-4">
                    <div
                      className="card h-100 shadow-sm border-0 doctor-card"
                      onClick={() => selectDoctor(doc)}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={
                          doc.imagen
                            ? `${API_URL}/doctores/imagen/${doc.imagen}`
                            : "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=center"
                        }
                        alt={doc.nombre}
                        className="card-img-top"
                        style={{
                          objectFit: "cover",
                          height: "200px",
                        }}
                        onError={(e) => (e.target.src = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=center")}
                      />
                      <div className="card-body text-center">
                        <h5 className="fw-bold text-dark">{doc.nombre}</h5>
                        <p className="text-success fw-semibold">{doc.especialidad}</p>
                        <p className="text-muted small mb-3">
                          <i className="fas fa-users me-1"></i>
                          Cupo: {doc.cupoPacientes} pacientes
                        </p>
                        <button className="btn btn-success btn-sm">
                          Seleccionar Doctor
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 2: // Selección de Fecha
        return (
          <div className="text-center">
            <h3 className="mb-4">
              <i className="fas fa-calendar-alt me-2 text-success"></i>
              Selecciona una Fecha
            </h3>
            
            <div className="row justify-content-center">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">
                      <i className="fas fa-user-md me-2"></i>
                      {selectedDoctor?.nombre}
                    </h5>
                    <p className="text-muted mb-4">{selectedDoctor?.especialidad}</p>
                    
                    <DatePicker
                      selected={selectedDate}
                      onChange={selectDate}
                      filterDate={filterDate}
                      locale={es}
                      inline
                      minDate={new Date()}
                      maxDate={addDays(new Date(), 30)}
                      className="form-control"
                      placeholderText="Selecciona una fecha"
                      dateFormat="dd/MM/yyyy"
                    />
                    
                    <small className="text-muted d-block mt-3">
                      <i className="fas fa-info-circle me-1"></i>
                      Solo se muestran días laborables disponibles
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Selección de Horario
        return (
          <div className="text-center">
            <h3 className="mb-4">
              <i className="fas fa-clock me-2 text-success"></i>
              Selecciona un Horario
            </h3>
            
            <div className="row justify-content-center">
              <div className="col-md-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">
                      <i className="fas fa-user-md me-2"></i>
                      {selectedDoctor?.nombre}
                    </h5>
                    <p className="text-success fw-semibold">{selectedDoctor?.especialidad}</p>
                    <p className="text-muted mb-4">
                      <i className="fas fa-calendar me-1"></i>
                      {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                    
                    {horariosLoading ? (
                      <LoadingSpinner text="Cargando horarios disponibles..." />
                    ) : horarios && horarios.length > 0 ? (
                      <div className="row g-2">
                        {horarios.map((horario) => (
                          <div key={horario.idHorario} className="col-md-4 col-6">
                            <button
                              className="btn btn-outline-success w-100 py-3"
                              onClick={() => selectHorario(horario)}
                            >
                              <div>
                                <i className="fas fa-clock me-2"></i>
                                <strong>{horario.horaInicio}</strong>
                              </div>
                              <small className="text-muted d-block">
                                {horario.turno}
                              </small>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon="fas fa-clock"
                        title="No hay horarios disponibles"
                        description="No se encontraron horarios disponibles para esta fecha."
                        actionButton={
                          <button className="btn btn-outline-primary" onClick={prevStep}>
                            <i className="fas fa-arrow-left me-2"></i>
                            Seleccionar otra fecha
                          </button>
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4: // Confirmación
        return (
          <div className="text-center">
            <h3 className="mb-4">
              <i className="fas fa-check-circle me-2 text-success"></i>
              Confirmar Cita
            </h3>
            
            <div className="row justify-content-center">
              <div className="col-md-6">
                <div className="card border-success shadow-sm">
                  <div className="card-header bg-success text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-clipboard-check me-2"></i>
                      Resumen de tu Cita
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row mb-3">
                      <div className="col-4">
                        <strong>Doctor:</strong>
                      </div>
                      <div className="col-8">
                        {selectedDoctor?.nombre}
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-4">
                        <strong>Especialidad:</strong>
                      </div>
                      <div className="col-8">
                        {selectedDoctor?.especialidad}
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-4">
                        <strong>Fecha:</strong>
                      </div>
                      <div className="col-8">
                        {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: es })}
                      </div>
                    </div>
                    
                    <div className="row mb-4">
                      <div className="col-4">
                        <strong>Hora:</strong>
                      </div>
                      <div className="col-8">
                        {selectedHorario?.horaInicio} - {selectedHorario?.horaFin}
                      </div>
                    </div>
                    
                    <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                      <ButtonLoading
                        loading={isSubmitting}
                        loadingText="Confirmando..."
                        onClick={reservarCita}
                        className="btn btn-success btn-lg px-4"
                      >
                        <i className="fas fa-calendar-check me-2"></i>
                        Confirmar Cita
                      </ButtonLoading>
                      
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={prevStep}
                        disabled={isSubmitting}
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Volver
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="container mt-4">
        {/* Progress Bar */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h4 className="text-center mb-4">
                  Agendar Cita - {idEspecialidad}
                </h4>
                
                <div className="progress mb-3" style={{ height: "8px" }}>
                  <div 
                    className="progress-bar bg-success" 
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                  ></div>
                </div>
                
                <div className="row text-center">
                  <div className="col-3">
                    <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                      <i className={`fas fa-user-md ${currentStep >= 1 ? 'text-success' : 'text-muted'}`}></i>
                      <small className="d-block">Doctor</small>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                      <i className={`fas fa-calendar-alt ${currentStep >= 2 ? 'text-success' : 'text-muted'}`}></i>
                      <small className="d-block">Fecha</small>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
                      <i className={`fas fa-clock ${currentStep >= 3 ? 'text-success' : 'text-muted'}`}></i>
                      <small className="d-block">Horario</small>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
                      <i className={`fas fa-check-circle ${currentStep >= 4 ? 'text-success' : 'text-muted'}`}></i>
                      <small className="d-block">Confirmar</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <SectionErrorBoundary>
          {renderStepContent()}
        </SectionErrorBoundary>

        {/* Navigation */}
        {currentStep > 1 && currentStep < 4 && (
          <div className="text-center mt-4">
            <button 
              className="btn btn-outline-secondary" 
              onClick={prevStep}
            >
              <i className="fas fa-arrow-left me-2"></i>
              Anterior
            </button>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .doctor-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15) !important;
          transition: all 0.3s ease;
        }
        
        .step.active i {
          transform: scale(1.2);
        }
        
        .react-datepicker {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        
        .react-datepicker__day--selected {
          background-color: #198754 !important;
        }
        
        .react-datepicker__day:hover {
          background-color: #d1e7dd !important;
        }
      `}</style>
    </Layout>
  );
}