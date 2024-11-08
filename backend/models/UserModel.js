const db = require('../db/conn')

module.exports = class UserModel{
    static async insertUser(name, registration, password){
        try{
            const [user] = await db.query('SELECT * FROM users WHERE registration = ?', [registration])

            if(user[0]){
                throw new Error('Erro: Matrícula já cadastrada!')
            }

            const data = [registration,name,password]

            const [insertedUser] = await db.execute("INSERT INTO users (registration, name, password) VALUES (?, ?, ?)", data)

            return insertedUser

        }catch(error){
            return error.message
        }
    }
    static async getUserByRegistration(registration){
        try {
            const [user] = await db.query('SELECT * FROM users WHERE registration = ?', [registration])
            if(user[0]){
                return user[0]
            } else{
                throw new Error('Erro: Usuário não encontrado!')
            }
        } catch (error) {
            return error.message
        }
    }
    static async getUserById(id){
        try {
            const [user] = await db.query('SELECT * FROM users WHERE id = ?', [id])
            if(user[0]){
                return user[0]
            } else{
                throw new Error('Erro: Usuário não encontrado!')
            }
        } catch (error) {
            return error.message
        }
    }
    static async updateUser(name, password, id){
        try {
            const dataSQL = []
            const data = []

            if(name){
                data.push(name)
                dataSQL.push(' name = ?')
            }
            if(password){
                data.push(password)
                dataSQL.push(' password = ?')
            }
            data.push(id)

            const operacao = await db.execute(`UPDATE users SET${dataSQL} WHERE id = ?`, data)

            if(operacao[0].affectedRows === 0){
                throw new Error("Erro: Usuário não encontrado!")
                return
            }
            return operacao[0]
                
        } catch (error) {
            return error.message
        }
    }
}