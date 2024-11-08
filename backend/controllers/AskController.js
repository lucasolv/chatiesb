const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const removerCitacoes = require("../helpers/removeCitations");
const formattedArray = require("../helpers/formatted-array-assistant-answers");

// Objeto para armazenar sessões temporariamente (simula um banco de dados para testes)
const userSessions = {};

module.exports = class AskController {
    static async doQuestion(req, res) {
        const userId = req.body.id;
        
        try {
            let threadId;
            if (userSessions[userId] && userSessions[userId].threadId) {
                threadId = userSessions[userId].threadId;
            } else {
                const thread = await openai.beta.threads.create();
                threadId = thread.id;
                
                userSessions[userId] = { threadId };
            }

            const message = await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: req.body.question
            });

            const run = await openai.beta.threads.runs.createAndPoll(threadId, {
                assistant_id: process.env.ASSISTANT_ID,
                instructions: "You are a teacher of the subject: Auditoria e Segurança no Desenvolvimento de Aplicações. Follow these instructions: Whenever you receive a question or multiple choice question, the answer and justification must be based only on the documents provided. Whenever possible, include a practical example in the justification to facilitate understanding. Only in this case may you use your own sources of knowledge."
            });

            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(run.thread_id);
                const responseMessages = messages.data.reverse().map(
                    (message) => `${message.role} > ${removerCitacoes(message.content[0].text.value)}`
                );
                res.json(formattedArray(responseMessages));
            } else {
                console.log(`Run status: ${run.status}`);
                res.status(500).json({ error: "Erro no processamento da pergunta." });
            }
        } catch (error) {
            console.error("Erro ao processar a pergunta:", error);
            res.status(500).json({ error: "Erro interno do servidor." });
        }
    }
}
