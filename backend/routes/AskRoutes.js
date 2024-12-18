const router = require('express').Router()
const AskController = require('../controllers/AskController')

//middlewares
const verifyToken = require('../helpers/verify-token')

/* router.post('/register',UserController.register) */
router.post('/question', verifyToken, AskController.doQuestion)
router.get('/messages', verifyToken, AskController.getMessages)


module.exports = router