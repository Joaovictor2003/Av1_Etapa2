// ================================================================
// SIMULAÇÃO DA URNA ELETRÔNICA - AV1 ETAPA 2
// ================================================================

const cargos2026 = [
    { nome: "Deputado Federal", digitos: 4 },
    { nome: "Deputado Estadual", digitos: 5 },
    { nome: "Senador (1ª Vaga)", digitos: 3 },
    { nome: "Senador (2ª Vaga)", digitos: 3 },
    { nome: "Governador", digitos: 2 },
    { nome: "Presidente", digitos: 2 }
];

// Os três arquivos enviados nesta etapa.
// Se o grupo tiver outro partido, basta acrescentar o nome do JSON aqui.
const arquivosPartidos = [
    "PMauricio.json",
    "PDC.json",
    "Pmarvel.json"
];

let baseCandidatos = [];
let etapaAtual = 0;
let numeroDigitado = "";
let votoEmBranco = false;
let votacaoBloqueada = false;
let candidatoAtualElegivel = null;
let votoEleitorAtual = {};
const memoriaVotosEleitores = [];
let audioCtx = null;

window.onload = async () => {
    await carregarTodosCandidatos();
    iniciarNovoEleitor();
    document.addEventListener("keydown", tratarTecladoFisico);
};

// ---------------------------------------------------------------
// 1. INTEGRAÇÃO DOS JSONs
// ---------------------------------------------------------------

async function carregarTodosCandidatos() {
    baseCandidatos = [];
    const arquivosCarregados = [];
    const arquivosNaoEncontrados = [];

    for (const arquivo of arquivosPartidos) {
        try {
            const resposta = await fetch(arquivo);

            if (!resposta.ok) {
                arquivosNaoEncontrados.push(arquivo);
                continue;
            }

            const dados = await resposta.json();
            const lista = Array.isArray(dados)
                ? dados
                : Object.values(dados).flat();

            const siglaPartido = arquivo.replace(".json", "");

            const listaFormatada = lista.map(candidato => ({
                ...candidato,
                partido: candidato.partido || candidato.sigla || siglaPartido
            }));

            baseCandidatos.push(...listaFormatada);
            arquivosCarregados.push(arquivo);
        } catch (erro) {
            arquivosNaoEncontrados.push(arquivo);
            console.warn("Não foi possível carregar:", arquivo, erro);
        }
    }

    const status = document.getElementById("statusSistema");

    if (arquivosCarregados.length === 0) {
        status.textContent = "Erro: nenhum arquivo JSON de candidatura foi carregado.";
        return;
    }

    status.textContent =
        `${baseCandidatos.length} candidaturas carregadas de ${arquivosCarregados.length} partido(s).` +
        (arquivosNaoEncontrados.length
            ? ` Arquivo(s) não encontrado(s): ${arquivosNaoEncontrados.join(", ")}.`
            : "");
}

// ---------------------------------------------------------------
// 2. FLUXO DO ELEITOR
// ---------------------------------------------------------------

function iniciarNovoEleitor() {
    if (votacaoBloqueada) return;

    etapaAtual = 0;
    votoEleitorAtual = {};
    iniciarEtapa();
}

function iniciarEtapa() {
    numeroDigitado = "";
    votoEmBranco = false;
    candidatoAtualElegivel = null;

    const cargo = cargos2026[etapaAtual];

    document.getElementById("lblCargo").textContent = cargo.nome;
    document.getElementById("dadosCandidato").innerHTML = "";
    esconderFoto();
    renderizarQuadradosDigitos(cargo.digitos);
}

function renderizarQuadradosDigitos(qtd) {
    const container = document.getElementById("containerDigitos");
    container.style.display = "flex";
    container.innerHTML = "";

    for (let i = 0; i < qtd; i++) {
        const div = document.createElement("div");
        div.className = i === 0 ? "digito pisca" : "digito";
        div.id = `digito-${i}`;
        container.appendChild(div);
    }
}

function digitar(n) {
    if (votacaoBloqueada || votoEmBranco) return;

    const cargo = cargos2026[etapaAtual];

    if (numeroDigitado.length >= cargo.digitos) return;

    numeroDigitado += String(n);

    const digitoElem =
        document.getElementById(`digito-${numeroDigitado.length - 1}`);

    if (digitoElem) {
        digitoElem.textContent = n;
        digitoElem.classList.remove("pisca");
    }

    if (numeroDigitado.length < cargo.digitos) {
        const proximoElem =
            document.getElementById(`digito-${numeroDigitado.length}`);

        if (proximoElem) proximoElem.classList.add("pisca");
    }

    if (numeroDigitado.length === cargo.digitos) {
        verificarCandidatoDigitado(numeroDigitado, cargo.nome);
    }
}

// ---------------------------------------------------------------
// 3. CONSULTA DA CANDIDATURA
// ---------------------------------------------------------------

function normalizarCargo(cargo) {
    const texto = cargo.toLowerCase();

    if (texto.includes("senador")) return "senador";
    if (texto.includes("governador")) return "governador";
    if (texto.includes("presidente")) return "presidente";
    if (texto.includes("federal")) return "federal";
    if (texto.includes("estadual")) return "estadual";

    return texto;
}

function verificarCandidatoDigitado(numero, cargoNome) {
    const cargoNormalizado = normalizarCargo(cargoNome);

    candidatoAtualElegivel = baseCandidatos.find(candidato => {
        const mesmoNumero =
            String(candidato.numero) === String(numero);

        const cargoCandidato =
            String(candidato.cargo || "").toLowerCase();

        if (!mesmoNumero) return false;

        if (cargoNormalizado === "senador")
            return cargoCandidato.includes("senador");

        if (cargoNormalizado === "governador")
            return cargoCandidato.includes("governador");

        if (cargoNormalizado === "presidente")
            return cargoCandidato.includes("presidente");

        if (cargoNormalizado === "federal")
            return cargoCandidato.includes("federal");

        if (cargoNormalizado === "estadual")
            return cargoCandidato.includes("estadual");

        return false;
    });

    const dados = document.getElementById("dadosCandidato");

    if (candidatoAtualElegivel) {
        dados.innerHTML = `
            <strong>Nome:</strong> ${escaparHTML(candidatoAtualElegivel.nome)}<br>
            <strong>Partido:</strong> ${escaparHTML(candidatoAtualElegivel.partido)}<br>
            <strong>Número:</strong> ${escaparHTML(candidatoAtualElegivel.numero)}
        `;

        mostrarFoto(candidatoAtualElegivel.foto, candidatoAtualElegivel.nome);
    } else {
        dados.innerHTML = `
            <strong>VOTO NULO</strong><br>
            Número não corresponde a uma candidatura válida para este cargo.
        `;
        esconderFoto();
    }
}

// ---------------------------------------------------------------
// 4. BRANCO / CORRIGE / CONFIRMA
// ---------------------------------------------------------------

function votarBranco() {
    if (votacaoBloqueada) return;

    numeroDigitado = "";
    votoEmBranco = true;
    candidatoAtualElegivel = null;

    document.querySelectorAll(".digito").forEach(d => {
        d.textContent = "";
        d.classList.remove("pisca");
    });

    esconderFoto();

    document.getElementById("dadosCandidato").innerHTML =
        "<strong>VOTO EM BRANCO</strong>";
}

function corrigir() {
    if (votacaoBloqueada) return;

    numeroDigitado = "";
    votoEmBranco = false;
    candidatoAtualElegivel = null;

    document.querySelectorAll(".digito").forEach(d => {
        d.textContent = "";
        d.classList.remove("pisca");
    });

    const primeiro = document.getElementById("digito-0");
    if (primeiro) primeiro.classList.add("pisca");

    document.getElementById("dadosCandidato").innerHTML = "";
    esconderFoto();
}

function confirmar() {
    if (votacaoBloqueada) return;

    if (!votoEmBranco && numeroDigitado.length !== cargos2026[etapaAtual].digitos) {
        mostrarMensagemTemporaria("Digite todos os números do cargo.");
        return;
    }

    registrarVotoAtual();
    tocarSomUrna();

    if (etapaAtual < cargos2026.length - 1) {
        etapaAtual++;
        setTimeout(iniciarEtapa, 450);
    } else {
        finalizarEleitor();
    }
}

function registrarVotoAtual() {
    const cargo = cargos2026[etapaAtual];

    let registro;

    if (votoEmBranco) {
        registro = {
            cargo: cargo.nome,
            tipo: "branco",
            numero: null,
            candidato: null,
            partido: null
        };
    } else if (candidatoAtualElegivel) {
        registro = {
            cargo: cargo.nome,
            tipo: "nominal",
            numero: candidatoAtualElegivel.numero,
            candidato: candidatoAtualElegivel.nome,
            partido: candidatoAtualElegivel.partido
        };
    } else {
        registro = {
            cargo: cargo.nome,
            tipo: "nulo",
            numero: numeroDigitado,
            candidato: null,
            partido: null
        };
    }

    votoEleitorAtual[cargo.nome] = registro;
}

function finalizarEleitor() {
    memoriaVotosEleitores.push({
        eleitor: memoriaVotosEleitores.length + 1,
        votos: votoEleitorAtual
    });

    votacaoBloqueada = true;

    document.getElementById("tela").innerHTML =
        '<div class="mensagem-fim">F I M</div>';

    setTimeout(() => {
        if (!document.getElementById("conteudo-voto")) {
            location.reload();
            return;
        }

        votacaoBloqueada = false;
        iniciarNovoEleitor();
    }, 2500);
}

// ---------------------------------------------------------------
// 5. EXPORTAÇÃO votos.json
// ---------------------------------------------------------------

function encerrarVotacaoEEnviarTSE() {
    if (votacaoBloqueada) return;

    if (memoriaVotosEleitores.length === 0) {
        const confirmarVazio = confirm(
            "Nenhum eleitor terminou a votação. Deseja mesmo encerrar?"
        );

        if (!confirmarVazio) return;
    }

    votacaoBloqueada = true;

    const arquivo = {
        sistema: "Simulação de Urna Eletrônica - AV1 Etapa 2",
        eleicao: 2026,
        dataExportacao: new Date().toISOString(),
        totalEleitores: memoriaVotosEleitores.length,
        votos: memoriaVotosEleitores
    };

    const json = JSON.stringify(arquivo, null, 2);
    baixarArquivo("votos.json", json, "application/json");

    document.getElementById("statusSistema").textContent =
        `Votação encerrada. ${memoriaVotosEleitores.length} eleitor(es) registrados. votos.json gerado.`;

    document.getElementById("btnEncerrar").disabled = true;
}

// ---------------------------------------------------------------
// 6. BÔNUS 1 - BOLETIM DE URNA
// ---------------------------------------------------------------

function calcularApuracao() {
    const apuracao = {};

    cargos2026.forEach(cargo => {
        apuracao[cargo.nome] = {
            candidatos: {},
            branco: 0,
            nulo: 0
        };
    });

    memoriaVotosEleitores.forEach(eleitor => {
        Object.values(eleitor.votos).forEach(voto => {
            const resultado = apuracao[voto.cargo];

            if (!resultado) return;

            if (voto.tipo === "branco") {
                resultado.branco++;
            } else if (voto.tipo === "nulo") {
                resultado.nulo++;
            } else if (voto.tipo === "nominal") {
                const chave = `${voto.numero} - ${voto.candidato}`;
                resultado.candidatos[chave] =
                    (resultado.candidatos[chave] || 0) + 1;
            }
        });
    });

    return apuracao;
}

function mostrarApuracao() {
    const container = document.getElementById("resultadoApuracao");
    const apuracao = calcularApuracao();

    let html = "";

    if (memoriaVotosEleitores.length === 0) {
        html = '<div class="aviso">Ainda não há votos registrados.</div>';
    } else {
        html += `<p><strong>Total de eleitores:</strong> ${memoriaVotosEleitores.length}</p>`;

        cargos2026.forEach(cargo => {
            const resultado = apuracao[cargo.nome];

            html += `
                <h3>${cargo.nome}</h3>
                <table class="tabela-apuracao">
                    <thead>
                        <tr>
                            <th>Resultado</th>
                            <th>Quantidade</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            Object.entries(resultado.candidatos).forEach(([nome, quantidade]) => {
                html += `
                    <tr>
                        <td>${escaparHTML(nome)}</td>
                        <td>${quantidade}</td>
                    </tr>
                `;
            });

            html += `
                    <tr>
                        <td>Votos brancos</td>
                        <td>${resultado.branco}</td>
                    </tr>
                    <tr>
                        <td>Votos nulos</td>
                        <td>${resultado.nulo}</td>
                    </tr>
                    </tbody>
                </table>
            `;
        });
    }

    container.innerHTML = html;
    document.getElementById("apuracao").hidden = false;
}

function fecharApuracao() {
    document.getElementById("apuracao").hidden = true;
}

// ---------------------------------------------------------------
// 7. BÔNUS 2 - SOM "PILILI" VIA WEB AUDIO API
// ---------------------------------------------------------------

function tocarSomUrna() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();

        const agora = audioCtx.currentTime;

        [880, 1175].forEach((frequencia, indice) => {
            const oscilador = audioCtx.createOscillator();
            const ganho = audioCtx.createGain();

            oscilador.type = "sine";
            oscilador.frequency.value = frequencia;

            ganho.gain.setValueAtTime(0.0001, agora + indice * 0.10);
            ganho.gain.exponentialRampToValueAtTime(
                0.18,
                agora + indice * 0.10 + 0.02
            );
            ganho.gain.exponentialRampToValueAtTime(
                0.0001,
                agora + indice * 0.10 + 0.13
            );

            oscilador.connect(ganho);
            ganho.connect(audioCtx.destination);

            oscilador.start(agora + indice * 0.10);
            oscilador.stop(agora + indice * 0.10 + 0.14);
        });
    } catch (erro) {
        console.warn("Áudio indisponível:", erro);
    }
}

// ---------------------------------------------------------------
// 8. TECLADO FÍSICO
// ---------------------------------------------------------------

function tratarTecladoFisico(evento) {
    if (votacaoBloqueada) return;

    if (/^[0-9]$/.test(evento.key)) {
        digitar(evento.key);
        return;
    }

    const tecla = evento.key.toLowerCase();

    if (tecla === "enter") confirmar();
    if (tecla === "escape") corrigir();
    if (tecla === "b") votarBranco();
}

// ---------------------------------------------------------------
// 9. UTILITÁRIOS
// ---------------------------------------------------------------

function mostrarMensagemTemporaria(mensagem) {
    const dados = document.getElementById("dadosCandidato");
    dados.innerHTML = `<strong>${escaparHTML(mensagem)}</strong>`;

    setTimeout(() => {
        if (!votoEmBranco && !candidatoAtualElegivel) {
            dados.innerHTML = "";
        }
    }, 1800);
}

function mostrarFoto(caminho, nome) {
    const imagem = document.getElementById("imgCandidato");

    imagem.onerror = () => {
        imagem.classList.add("erro");
        imagem.alt = `Foto não encontrada: ${nome}`;
    };

    imagem.onload = () => {
        imagem.classList.remove("erro");
    };

    imagem.src = caminho || "";
    imagem.alt = `Foto de ${nome}`;
    imagem.style.display = "block";
}

function esconderFoto() {
    const imagem = document.getElementById("imgCandidato");
    imagem.style.display = "none";
    imagem.classList.remove("erro");
    imagem.src = "";
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function baixarArquivo(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
