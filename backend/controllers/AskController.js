const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const removerCitacoes = require("../helpers/removeCitations");
const formattedArray = require("../helpers/formatted-array-assistant-answers");
const userModel = require("../models/UserModel")

module.exports = class AskController {
    static async doQuestion(req, res) {
        const user = await userModel.getUserById(req.user.id);

        try {
            let threadId;
            user.threadIds = JSON.parse(user.threadIds);

            if (user.threadIds.length > 0) {
                const lastThread = user.threadIds[user.threadIds.length - 1];
                threadId = Object.values(lastThread)[0];
            } else if (req.body.createNewThread) {
                if(!req.body.threadTitle){
                    return res.status(422).json({ error: "Título da conversa não informado." });
                }
                const threadTitle = req.body.threadTitle
                const thread = await openai.beta.threads.create();
                threadId = thread.id;

                user.threadIds.push({ [user.threadIds.length + 1]: threadId, threadTitle: threadTitle });
                
                user.threadIds = JSON.stringify(user.threadIds)
                await userModel.saveThreadIds(user)
            } else {
                return res.status(400).json({ error: "Nenhuma conversa existente." });
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
                res.status(200).json(formattedArray(responseMessages));
            } else {
                console.log(`Run status: ${run.status}`);
                res.status(500).json({ error: "Erro no processamento da pergunta." });
            }
        } catch (error) {
            console.error("Erro ao processar a pergunta:", error);
            res.status(500).json({ error: "Erro interno do servidor." });
        }
    }
    static async getMessages(req, res) {
        if (!req.query.threadId) {
            res.status(422).json({ message: "Id não informado" });
            return;
        }
        
        const reqthreadId = req.query.threadId;
    
        try {
            const user = await userModel.getUserById(req.user.id);
            user.threadIds = JSON.parse(user.threadIds);
    
            if (reqthreadId > user.threadIds.length || reqthreadId < 1) {
                res.status(404).json({ message: "Thread não encontrada" });
                return;
            }
    
            const threadData = user.threadIds[reqthreadId - 1]; 
            const threadId = threadData[reqthreadId]; 
            const threadTitle = threadData.threadTitle; 
    
            const messages = await openai.beta.threads.messages.list(threadId);
            const conversation = messages.data.map(message => ({
                role: message.role,
                content: removerCitacoes(message.content[0].text.value)
            }));
    
            res.status(200).json({ conversationTitle: threadTitle, conversation: conversation });
        } catch (error) {
            console.error("Erro ao recuperar a conversa:", error);
            res.status(500).json({ error: "Erro ao recuperar a conversa." });
        }
    }
}