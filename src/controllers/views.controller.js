const ProductsServices = require('../services/products/products.service')
const CartsServices = require('../services/carts/carts.service')
const UsersServices = require('../services/users/users.service')
const { UserDAO } = require('../dao/factory')

const { generateProduct } = require('../mocks/generateProducts')
const { generateUser } = require("../mocks/generateUsers")

const { CartDAO, ProductDAO } = require('../dao/factory')
const { ADMIN, SUPER_ADMIN, USER_PREMIUM } = require('../config/policies.constants')
const { CustomError } = require('../services/errors/CustomError')
const { ErrorCodes } = require('../services/errors/errorCodes')

class ViewsController {

    constructor() {
        const productDAO = ProductDAO()
        this.productsService = new ProductsServices(productDAO)
        const cartsDAO = CartDAO()
        this.cartsService = new CartsServices(cartsDAO)
        const userDAO = UserDAO()
        this.usersServices = new UsersServices(userDAO)
    }

    async getProducts(req, res) {
        try {
            const filteredProducts = await this.productsService.getProducts(req.query)

            let user = req.session.user
            let isAdmin = [ADMIN].includes(req.session.user.rol)
            let isPremium = [USER_PREMIUM].includes(req.session.user.rol)

            const data = {
                title: 'All Products',
                scripts: ['allProducts.js'],
                styles: ['home.css', 'allProducts.css'],
                useWS: false,
                user,
                filteredProducts,
                isAdmin,
                isPremium
            }

            res.render('allProducts', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    async getProductDetail(req, res) {
        try {
            const prodId = req.pid
            const user = req.session.user

            const product = await this.productsService.getProductById(prodId)
            if (!product) {
                return product === false
                    // HTTP 404 => el ID es válido, pero no se encontró ese producto
                    //return res.status(404).json(`El producto con código '${prodId}' no existe.`)
                    ? res.sendNotFoundError(`El producto con código '${prodId}' no existe.`)
                    : res.sendServerError({ message: 'Something went wrong!' })
            }

            //const carts = await this.cartsService.getCarts()
            let cid = user.cart //carts[0]._id
            let isNotAdmin = ![ADMIN, SUPER_ADMIN].includes(req.session.user.rol)
            let data = {
                title: 'Product detail',
                scripts: ['productDetail.js'],
                styles: ['home.css', 'productDetail.css'],
                useWS: false,
                useSweetAlert: true,
                product,
                cid,
                isNotAdmin
            }

            res.render('productDetail', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    async addProductToCart(req, res) {
        try {
            const user = req.session.user
            const prodId = req.pid
            const product = await this.productsService.getProductById(prodId)
            if (!product) {
                return product === false
                    // HTTP 404 => el ID es válido, pero no se encontró ese producto
                    //return res.status(404).json(`El producto con código '${prodId}' no existe.`)
                    ? res.sendNotFoundError(`El producto con código '${prodId}' no existe.`)
                    : res.sendServerError({ message: 'Something went wrong!' })
            }

            // //agrego una unidad del producto al primer carrito que siempre existe
            // const carts = await this.cartsService.getCarts()
            let quantity = 1
            const result = await this.cartsService.addProductToCart(user.cart, prodId, quantity);
            if (result) {
                this.showAlert(res, user.cart, product)
                //return res.sendSuccess(`Se agregaron ${quantity} producto/s con ID ${prodId} al carrito con ID ${user.cart}.`)
            }
            else
                throw CustomError.createError({
                    name: 'InvalidAction',
                    cause: `No se pudo agregar el producto '${prodId}' al carrito '${user.cart}'.`,
                    message: 'Error trying to add a product to a cart',
                    code: ErrorCodes.INVALID_TYPES_ERROR
                })
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    showAlert = (res, userCart, product) => {
        try {
            const alertMessage = {
                icon: 'success',
                title: 'Compra confirmada.',
                text: `El producto ${product.title} se agregó al carrito.`
            }

            let cid = userCart //carts[0]._id
            let data = {
                title: 'Product detail',
                scripts: ['productDetail.js'],
                styles: ['home.css', 'productDetail.css'],
                useWS: false,
                useSweetAlert: true,
                product,
                cid,
                alertMessage
            }

            res.render('productDetail', data)
        }
        catch (err) {
            return res.sendServerError(err)
        }
    }

    async getCartById(req, res) {
        try {
            const cartId = req.cid
            const cart = await this.cartsService.getCartById(cartId)

            if (!cart) {
                return cart === false
                    // HTTP 404 => el ID es válido, pero no se encontró ese carrito
                    // return res.status(404).json(`El carrito con código '${cartId}' no existe.`)
                    ? res.sendNotFoundError(`El carrito con código '${cartId}' no existe.`)
                    : res.sendServerError({ message: 'Something went wrong!' })
            }

            let cid = cartId
            let notEmptyCart = (cart.products.length != 0)
            let data = {
                title: 'Cart detail',
                // scripts: ['cartDetail.js'],
                styles: ['home.css', 'cartDetail.css'],
                useWS: false,
                useSweetAlert: true,
                cart,
                cid,
                notEmptyCart
            }

            res.render('cartDetail', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    async getRealTimeProducts(req, res) {
        try {
            let allProducts = await this.productsService.getProducts(req.query)

            const data = {
                title: 'Real Time Products',
                scripts: ['allProducts.js'],
                styles: ['home.css', 'allProducts.css'],
                useWS: false,
                allProducts
            }

            res.render('realTimeProducts', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    createProduct(req, res) {
        try {
            const data = {
                title: 'Create Product',
                // scripts: ['createProduct.js'],
                styles: ['home.css'],
                useWS: false
            }

            res.render('createProduct', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    chat(req, res) {
        try {
            const data = {
                title: 'Aplicación de chat',
                useWS: true,
                useSweetAlert: true,
                scripts: ['message.js'],
                styles: ['home.css']
            }

            res.render('message', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    home(req, res) {
        try {
            const isLoggedIn = ![null, undefined].includes(req.session.user)

            const data = {
                title: 'Inicio',
                isLoggedIn,
                isNotLoggedIn: !isLoggedIn,
            }

            res.render('index', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    login(req, res) {
        try {
            // sólo se puede acceder si NO está logueado
            const data = {
                title: 'Login'
            }
            res.render('login', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    resetPassword(req, res) {
        try {
            // sólo se puede acceder si NO está logueado
            const token = req.params.token
            const email = req.params.email
            const data = {
                title: 'Reset Password',
                email,
                token
            }

            res.render('resetPassword', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    forgetPassword(req, res) {
        try {
            // sólo se puede acceder si NO está logueado
            const data = {
                title: 'Forget Password'
            }
            res.render('forgetPassword', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    register(req, res) {
        try {
            //sólo se puede acceder si NO está logueado
            const data = {
                title: 'Register'
            }
            res.render('register', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    profile(req, res) {
        try {
            //sólo se puede acceder SI está logueado
            let user = req.session.user
            const data = {
                title: 'Mi perfil',
                user: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    age: user.age,
                    email: user.email
                }
            }

            res.render('profile', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    mockingProducts(req, res) {
        const products = []
        for (let i = 0; i < 100; i++) {
            products.push(generateProduct())
        }
        res.json(products)
    }

    mockingUsers(req, res) {
        const users = []
        for (let i = 0; i < 100; i++) {
            users.push(generateUser())
        }
        res.json(users)
    }

    loggerTest(req, res) {
        try {
            req.logger.debug('DEBUG test example')
            req.logger.http('HTTP test example')
            req.logger.info('INFO test example')
            req.logger.warning('WARNING test example')
            req.logger.error('ERROR test example')
            req.logger.fatal('FATAL test example')
            res.sendSuccess('Logger test finalizó exitosamente')
        }
        catch (err) {
            return res.sendServerError(err)  //{message: 'Error en el logger test'})
        }
    }

    async adminUsers(req, res) {
        try {
            //sólo se puede acceder SI está logueado y es ADMIN
            let user = req.session.user
            const users = await this.usersServices.getUsers()

            const data = {
                title: "Administración de Usuarios",
                useWS: false,
                useSweetAlert: true,
                scripts: ['deleteUser.js', 'deleteOldUsers.js', 'changeRol.js'],
                styles: ['home.css'],
                user,
                users,
            }
            res.render('allUsers', data)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

}

module.exports = ViewsController