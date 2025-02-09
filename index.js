require("dotenv").config();
const express = require("express");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Configurar CORS correctamente
const corsOptions = {
  origin: ["http://localhost:4200", "https://libelulahotel.com.pe"], // Permitir Angular y producción
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Manejar preflight requests

// Configurar AWS SES v3
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Función para cargar y reemplazar variables en la plantilla HTML
const cargarPlantilla = (filePath, variables) => {
  let template = fs.readFileSync(filePath, "utf8");
  for (const key in variables) {
    template = template.replace(new RegExp(`{{${key}}}`, "g"), variables[key] || "N/A");
  }
  return template;
};

// Ruta para enviar correos con la plantilla
app.post("/enviar-correo", async (req, res) => {
  const { nombre, correo, telefono, direccion, motivo, pais, mensaje } = req.body;

  // Validar que todos los campos estén presentes
  if (!nombre || !correo || !telefono || !direccion || !motivo || !pais || !mensaje) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  // Cargar la plantilla y reemplazar los valores
  const htmlTemplate = cargarPlantilla("emailTemplate.html", { nombre, correo, telefono, direccion, motivo, pais, mensaje });

  // Configuración del email
  const params = {
    Source: process.env.REMITENTE_VERIFICADO,
    Destination: {
      ToAddresses: [process.env.DESTINATARIO],
    },
    Message: {
      Subject: { Data: `Nuevo mensaje de contacto de ${nombre}` },
      Body: {
        Text: { 
          Data: `Nombre y Apellidos: ${nombre}\nCorreo: ${correo}\nTeléfono: ${telefono}\nDirección: ${direccion}\nMotivo: ${motivo}\nPaís: ${pais}\nMensaje:\n${mensaje}`
        },
        Html: { Data: htmlTemplate },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const data = await sesClient.send(command);
    res.status(200).json({ message: "Correo enviado con éxito", MessageId: data.MessageId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});