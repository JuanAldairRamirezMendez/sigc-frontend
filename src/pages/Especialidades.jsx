import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_URL } from "../services/api";
import PublicLayout from "../layouts/PublicLayout";
import ClienteLayout from "../layouts/ClienteLayout";
import { CardSkeleton, EmptyState, RetryComponent } from "../components/loading/LoadingComponents";
import { SectionErrorBoundary } from "../components/loading/ErrorBoundaries";
import { useAsyncOperation } from "../hooks/useAsyncOperations";
import "../styles/Especialidades.css";

// Función para obtener imagen apropiada para cada especialidad
const getEspecialidadImage = (nombre) => {
  const images = {
    "Medicina General": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&crop=center",
    "Cardiología": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop&crop=center",
    "Neurología": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&crop=center",
    "Pediatría": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&crop=center",
    "Ginecología": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&crop=center",
    "Dermatología": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop&crop=center",
    "Oftalmología": "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop&crop=center",
    "Traumatología": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=300&fit=crop&crop=center"
  };

  const imageUrl = images[nombre] || "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&crop=center";
  console.log(`🖼️ Imagen para ${nombre}: ${imageUrl}`);
  return imageUrl;
};

// Componente de imagen con manejo de errores robusto
const EspecialidadImage = ({ especialidad, className }) => {
  const [currentImage, setCurrentImage] = useState(null);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);

  useEffect(() => {
    // Inicializar con la imagen del backend o la especialidad
    const backendImage = especialidad.imagen ? `${API_URL}/images/especialidades/${especialidad.imagen}` : null;
    setCurrentImage(backendImage || getEspecialidadImage(especialidad.nombre));
    setHasTriedFallback(false);
  }, [especialidad]);

  const handleImageError = () => {
    if (!hasTriedFallback) {
      // Intentar con la imagen de especialidad si falló la del backend
      if (especialidad.imagen) {
        setCurrentImage(getEspecialidadImage(especialidad.nombre));
        setHasTriedFallback(true);
      } else {
        // Si ya estamos en la imagen de especialidad, intentar con el fallback
        setCurrentImage(getFallbackImage(especialidad.nombre));
        setHasTriedFallback(true);
      }
    } else {
      // Si ya intentamos el fallback, usar la imagen por defecto final
      setCurrentImage("https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&crop=center");
    }
  };

  return (
    <img
      src={currentImage}
      alt={especialidad.nombre}
      className={className}
      onError={handleImageError}
    />
  );
};

export default function Especialidades() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  const { 
    loading, 
    error, 
    data: especialidades, 
    execute: fetchEspecialidades 
  } = useAsyncOperation();

  useEffect(() => {
    // Verificar si el usuario está autenticado
    const usuario = localStorage.getItem("usuario");
    setIsAuthenticated(!!usuario);

    // Cargar especialidades
    loadEspecialidades();
  }, []);

  const loadEspecialidades = async () => {
    try {
      await fetchEspecialidades(async () => {
        const res = await api.get("/especialidades");
        return Array.isArray(res.data) ? res.data : [];
      });
    } catch (err) {
      console.error("Error al obtener las especialidades:", err);
    }
  };

  const handleVerDoctores = (nombreEspecialidad) => {
    navigate(`/turnos/${encodeURIComponent(nombreEspecialidad)}`);
  };

  // Usar el layout correcto según si está autenticado o no
  const Layout = isAuthenticated ? ClienteLayout : PublicLayout;

  const renderContent = () => {
    if (loading) {
      return <CardSkeleton count={6} />;
    }

    if (error) {
      return (
        <RetryComponent
          error="Error al cargar especialidades"
          description="No se pudieron obtener las especialidades médicas. Verifica tu conexión."
          onRetry={loadEspecialidades}
        />
      );
    }

    if (!especialidades || especialidades.length === 0) {
      return (
        <EmptyState
          icon="fas fa-stethoscope"
          title="No hay especialidades disponibles"
          description="Actualmente no contamos con especialidades médicas registradas."
          actionButton={
            <button 
              className="btn btn-primary" 
              onClick={loadEspecialidades}
            >
              <i className="fas fa-refresh me-2"></i>
              Actualizar
            </button>
          }
        />
      );
    }

    return (
      <div className="especialidades-grid">
        {especialidades.map((esp) => (
          <div key={esp.idEspecialidad} className="card-especialidad">
            <div className="img-wrapper">
              <EspecialidadImage
                especialidad={esp}
                className="img-especialidad"
              />
            </div>
            <h3>{esp.nombre}</h3>
            <p>{esp.descripcion}</p>
            <button
              onClick={() => handleVerDoctores(esp.nombre)}
              className="btn-ver"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Cargando...
                </>
              ) : (
                "Ver doctores disponibles"
              )}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="especialidades-container">
        <h1 className="titulo">Especialidades Médicas</h1>
        <p className="descripcion">
          Consulta las especialidades médicas disponibles y reserva tu cita.
        </p>

        <SectionErrorBoundary>
          {renderContent()}
        </SectionErrorBoundary>
      </div>
    </Layout>
  );
}
