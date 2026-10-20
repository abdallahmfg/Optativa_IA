
const RUTA = "./modelo/";

let model, webcam;
let activa = false;
let umbral = 80;
let ultimo = "";
let iniciando = false;

// Iniciar cámara
async function init() {
    if (activa || iniciando) return;

    iniciando = true;

    try {
        model = await tmImage.load(RUTA + "model.json", RUTA + "metadata.json");

        webcam = new tmImage.Webcam(300, 300, true);
        await webcam.setup();
        await webcam.play();

        activa = true;

        document.getElementById("webcam-container").innerHTML = "";
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        document.getElementById("label-container").innerHTML = "";

        window.requestAnimationFrame(loop);
    } catch (error) {
        document.getElementById("mensaje").textContent = "Error al iniciar cámara";
        console.error(error);
    }

    iniciando = false;
}

// Repetir predicciones
async function loop() {
    if (!activa) return;

    webcam.update();
    await predict();

    if (activa) window.requestAnimationFrame(loop);
}

// Reconocer objetos
async function predict() {
    const predicciones = await model.predict(webcam.canvas);
    if (!activa) return;

    let mayor = 0;
    let objeto = "";
    let texto = "";

    for (let p of predicciones) {
        let porcentaje = p.probability * 100;

        texto += p.className + ": " + porcentaje.toFixed(2) + "% | ";

        if (porcentaje > mayor) {
            mayor = porcentaje;
            objeto = p.className;
        }
    }

    document.getElementById("label-container").textContent = texto;

    if (mayor >= umbral) {
        document.getElementById("mensaje").textContent =
            "Detectado: " + objeto;

        if (objeto !== ultimo) {
            guardar(objeto);
            ultimo = objeto;
        }
    } else {
        document.getElementById("mensaje").textContent =
            "No se reconoce el objeto";
        ultimo = "";
    }
}

// Detener cámara
function detener() {
    activa = false;

    if (webcam) webcam.stop();

    document.getElementById("webcam-container").innerHTML = "";
    document.getElementById("label-container").innerHTML = "";
    document.getElementById("mensaje").textContent = "Cámara detenida";
    ultimo = "";
}

// Cambiar confianza mínima
function cambiarUmbral() {
    umbral = Number(document.getElementById("umbral").value);
    document.getElementById("valor").textContent = umbral + "%";
}

// Guardar historial
function guardar(objeto) {
    let lista = document.getElementById("historial");
    let elemento = document.createElement("li");

    elemento.textContent = objeto;
    lista.prepend(elemento);

    if (lista.children.length > 10) {
        lista.lastChild.remove();
    }
}

// Limpiar historial
function limpiar() {
    document.getElementById("historial").innerHTML = "";
    ultimo = "";
}

// Subir imagen
function subirImagen(event) {
    let archivo = event.target.files[0];
    if (!archivo) return;

    let imagen = document.getElementById("imagen");
    imagen.src = URL.createObjectURL(archivo);

    imagen.onload = async function() {
        try {
            if (!model) {
                model = await tmImage.load(RUTA + "model.json", RUTA + "metadata.json");
            }

            let predicciones = await model.predict(imagen);
            let mejor = predicciones[0];

            for (let p of predicciones) {
                if (p.probability > mejor.probability) {
                    mejor = p;
                }
            }

            let porcentaje = mejor.probability * 100;

            if (porcentaje >= umbral) {
                document.getElementById("resultadoImagen").textContent =
                    mejor.className + ": " + porcentaje.toFixed(2) + "%";
                guardar(mejor.className);
            } else {
                document.getElementById("resultadoImagen").textContent =
                    "No se reconoce el objeto";
            }
        } catch (error) {
            document.getElementById("resultadoImagen").textContent =
                "Error al analizar la imagen";
            console.error(error);
        }

        URL.revokeObjectURL(imagen.src);
    };
}
