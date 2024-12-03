const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const removerCitacoes = require("../helpers/removeCitations");
const formattedArray = require("../helpers/formatted-array-assistant-answers");
const userModel = require("../models/UserModel");
const UserModel = require("../models/UserModel");

module.exports = class AskController {
    static async doQuestion(req, res) {

        try {
            let threadId;
            let userThreadsArray;
            const userThreads = await userModel.getThreadsByUserId(req.user.id)

            if (userThreads.length > 0 && !req.body.createNewThread) {
                //não criar nova thread
                const chosenIndex = req.body.chosenThread !== undefined ? req.body.chosenThread - 1 : userThreads.length - 1;

                if (chosenIndex >= 0 && chosenIndex < userThreads.length) {
                    const chosenThread = userThreads[chosenIndex];
                    threadId = Object.values(chosenThread)[3];
                } else {
                    return res.status(400).json({ error: "Índice da thread escolhido é inválido." });
                }
                userThreadsArray = [...userThreads]
                req.body.chosenThread = req.body.chosenThread - 1
            } else if (req.body.createNewThread) {
                //criar nova
                if(!req.body.threadTitle){
                    return res.status(422).json({ error: "Título da conversa não informado." });
                }
                const threadTitle = req.body.threadTitle
                const thread = await openai.beta.threads.create();
                threadId = thread.id;

                const newThread = { threadTitle: threadTitle, userId: req.user.id, openAIThreadId: threadId, arrayIndex: userThreads.length + 1 }

                await userModel.addNewUserThread(newThread)
                userThreadsArray = [...userThreads, newThread]
                req.body.chosenThread = userThreads.length
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
                const responseMessages = messages.data.map(
                    (message) => `${message.role} > ${removerCitacoes(message.content[0].text.value)}`
                );
                res.status(200).json({threadId: userThreadsArray.length, conversationTitle: userThreadsArray[req.body.chosenThread].threadTitle, conversation: formattedArray(responseMessages)});
            } else {
                console.log(`Run status: ${run.status}`);
                console.log(run);
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
            const userThreads = await userModel.getThreadsByUserId(req.user.id)
    
            if (reqthreadId > userThreads.length || reqthreadId < 1) {
                res.status(404).json({ message: "Thread não encontrada" });
                return;
            }
    
            const threadData = userThreads[reqthreadId - 1]; 
            const threadId = threadData.openAIThreadId; 
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
    static async deleteChat(req, res){
        /* if (!req.query.threadId) {
            res.status(422).json({ message: "Id não informado" });
            return;
        }

        const reqthreadId = req.query.threadId; */
        try {
            UserModel.getThreadsByUserId(2)
        } catch (error) {
            console.log("ERO")
        }
    }
    static async getUserThreads(req, res){

        const userId = req.user.id

        try {
            const userThreads = await UserModel.getThreadsByUserId(userId)
            res.status(200).json({ userThreads: userThreads });
        } catch (error) {
            console.error("Erro ao recuperar conversas:", error);
            res.status(500).json({ error: "Erro ao recuperar conversas." });
        }
    }
}