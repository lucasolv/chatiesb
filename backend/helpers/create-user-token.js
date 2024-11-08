const jwt = require('jsonwebtoken')
require("dotenv").config()

const createUserToken = async (user, req, res) => {
    //create a token
    const token = jwt.sign({
        name: user.name,
        registration: user.registration,
        id: user.id,
        threadIds: user.threadIds
    }, process.env.JWT_SECRET)

    //return token
    res.status(200).json({
        message: "Você está autenticado",
        token: token,
        userId: user.id
    })
}

module.exports = createUserToken