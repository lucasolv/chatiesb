require("dotenv").config()
/* const pool = require('../db/conn') */
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
//helpers
const createUserToken = require('../helpers/create-user-token')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const UserModel = require('../models/UserModel')

module.exports = class UserController{
    static async register(req,res){
        const {name,registration,password,confirmPassword} = req.body

        //validations
        if(!name){
            res.status(422).json({message: 'O nome é obrigatório!'})
            return
        }
        if(!registration){
            res.status(422).json({message: 'A matrícula é obrigatória!'})
            return
        }
        if(!password){
            res.status(422).json({message: 'A senha é obrigatória!'})
            return
        }
        if(!confirmPassword){
            res.status(422).json({message: 'A confirmação de senha é obrigatória!'})
            return
        }
        if(password !== confirmPassword){
            res.status(422).json({message: 'A senha e a confirmação de senha precisam ser iguais!'})
            return
        }

        const salt = await bcrypt.genSalt(12)
        const passwordHash = await bcrypt.hash(password,salt)

        try {
            const response = await UserModel.insertUser(name, registration, passwordHash)
            if(response === "Matrícula já cadastrada!"){
                throw new Error(response)
            } else{
                const user = await UserModel.getUserByRegistration(registration)
                await createUserToken({
                    name: user.name,
                    id: user.id,
                    registration: user.registration,
                    threadIds: JSON.parse(user.threadIds)
                },req,res)
            }
        } catch (error) {
            res.status(500).json({message: error.message})
        }
    }
    static async login(req,res){
        const {registration,password} = req.body

        if(!registration){
            res.status(422).json({message: 'A matrícula é obrigatória!'})
            return
        }
        if(!password){
            res.status(422).json({message: 'A senha é obrigatória!'})
            return
        }

        //check if user exists by registration
        try {
            const response = await UserModel.getUserByRegistration(registration)
            if(response === "Usuário não encontrado!"){
                res.status(404).json({message: response})
                return
            }
            
            //check if password match with db password
            const checkPassword = await bcrypt.compare(password, response.password)

            if(!checkPassword){
                res.status(422).json({message: 'Senha inválida!'})
                return
            }
            await createUserToken(response,req,res)
        } catch (error) {
            res.status(500).json({message: error.message})
        }
    }
    static async checkUser(req,res){
        let currentUser
        if(req.headers.authorization){
            const token = getToken(req)
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                const response = await UserModel.getUserByRegistration(decoded.registration)
                if(response === "Usuário não encontrado!"){
                    res.status(404).json({message: response})
                    return
                }
                currentUser = {...response}
                currentUser.password = undefined
                currentUser.threadIds = JSON.parse(currentUser.threadIds)
                res.status(200).json(currentUser)
            } catch (error) {
                res.status(500).json({message: error.message})
            }
        } else{
            currentUser = null
            res.status(200).send(currentUser)
        }
    }
    static async getUserById(req,res){
        if(!req.params.id){
            res.status(422).json({message: "Id não informado."})
            return
        }
        const id = req.params.id
        try {
            const response = await UserModel.getUserById(id)
            if(response === "Usuário não encontrado!"){
                res.status(404).json({message: response})
                return
            }
            const user = {...response}
            user.password = undefined
            res.status(200).json(user)
        } catch (error) {
            res.status(500).json({message: error.message})
        }
    }
    static async editUser(req,res){
        if(!req.headers.authorization){
            res.status(401).json({message:'Acesso negado!'})
            return
        }
        const token = getToken(req)
        if(!token){
            res.status(401).json({message:'Acesso negado!'})
            return
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        try {
            const response = await UserModel.getUserById(decoded.id)
            if(response === "Usuário não encontrado!"){
                res.status(404).json({message: response})
                return
            }
            const user = {...response}
            if(JSON.stringify(user.id) === req.params.id){
                const {name, password, confirmPassword} = req.body
                //validations
                if(!name){
                    res.status(422).json({message: 'O nome é obrigatório!'})
                    return
                }
                if(!password){
                    res.status(422).json({message: 'A senha é obrigatória!'})
                    return
                }
                if(!confirmPassword){
                    res.status(422).json({message: 'A confirmação de senha é obrigatória!'})
                    return
                }
                if(password !== confirmPassword){
                    res.status(422).json({message: 'A senha e a confirmação de senha precisam ser iguais!'})
                    return
                }
                const salt = await bcrypt.genSalt(12)
                const passwordHash = await bcrypt.hash(password,salt)
                try {
                    const response = await UserModel.updateUser(name, passwordHash, user.id)
                    if(response === "Usuário não encontrado!"){
                        throw new Error(response)
                    } else{
                        res.status(200).json({message: "Usuário atualizado com sucesso!"})
                    }
                } catch (error) {
                    res.status(500).json({message: error.message})
                }
            } else{
                res.status(401).json({message:'Acesso negado!'})
                return
            }
        } catch (error) {
            res.status(500).json({message: error.message})
        }
    }
    static async getUserChats (req, res){
        let currentUser
        if(req.headers.authorization){
            const token = getToken(req)
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                const response = await UserModel.getUserByRegistration(decoded.registration)
                if(response === "Usuário não encontrado!"){
                    res.status(404).json({message: response})
                    return
                }
                currentUser = {...response}
                currentUser.password = undefined
                currentUser.threadIds = JSON.parse(currentUser.threadIds)
                const userThreads = await UserModel.getThreadsByUserId(currentUser.id)
                res.status(200).json({currentUser, userThreads})
            } catch (error) {
                res.status(500).json({message: error.message})
            }
        } else{
            currentUser = null
            res.status(200).send(currentUser)
        }
    }
    static async deleteChat(req, res){
        let currentUser
        if(req.headers.authorization){
            const token = getToken(req)
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                const response = await UserModel.getUserByRegistration(decoded.registration)
                if(response === "Usuário não encontrado!"){
                    res.status(404).json({message: response})
                    return
                }
                currentUser = {...response}
                currentUser.password = undefined
                if(req.params.openAIThreadId){
                    const response = await UserModel.deleteChat(req.params.openAIThreadId)
                } else{
                    res.status(200).send({"message": "O id da thread é obrigatório!"})
                }
            } catch (error) {
                res.status(500).json({message: error.message})
            }
        } else{
            currentUser = null
            res.status(200).send(currentUser)
        }
    }
}