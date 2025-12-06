import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { showSuccess, showError, showWarning } from "../utils/alerts";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      showWarning("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const userData = res.data;

      if (userData && !userData.error) {
        localStorage.setItem("usuario", JSON.stringify(userData));

        if (userData.rol === "ADMIN") {
          showSuccess("Bienvenido Administrador", "Acceso concedido");
          navigate("/admin");
        } else if (userData.rol === "PACIENTE") {
          showSuccess("Inicio de sesión exitoso", "Bienvenido a SIGC");
          navigate("/cliente");
        } else {
          showWarning("Rol desconocido: " + userData.rol);
        }
      } else {
        showError("Respuesta inválida del servidor");
      }
    } catch (err) {
      console.error("❌ Error en inicio de sesión:", err);
      showError("Error al iniciar sesión. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: "420px", width: "100%" }}>
        <h2 className="text-center mb-4 text-success fw-bold"> Iniciar Sesión</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Correo electrónico</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Contraseña</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-success w-100 fw-semibold ${
              loading ? "opacity-75" : ""
            }`}
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center mt-4 text-muted">
          ¿No tienes una cuenta?{" "}
          <Link to="/registrar" className="text-success fw-semibold">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}

