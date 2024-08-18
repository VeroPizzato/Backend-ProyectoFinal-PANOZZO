const ProductsServices = require('../services/products/products.service')
const UsersServices = require('../services/users/users.service')

const { ProductDAO, UserDAO } = require('../dao/factory')
const { ProductDTO } = require('../dao/dto/product.dto')
const { ADMIN, USER_PREMIUM } = require('../config/policies.constants')
//const { ADMIN_USER } = require('../config/config')

class ProductsController {

    constructor() {
        const productDAO = ProductDAO()
        this.productsService = new ProductsServices(productDAO)
        const userDAO = UserDAO()
        this.usersService = new UsersServices(userDAO)
    }

    async getAllProducts(req, res) {
        try {
            const allProducts = await this.productsService.getProducts(req.query)

            // HTTP 200 OK
            return res.sendSuccess(allProducts.docs)
        }
        catch (err) {
            //return res.status(500).json({ error: err })
            return res.sendServerError(err)
        }
    }

    async getProducts(req, res) {
        try {
            const filteredProducts = await this.productsService.getProducts(req.query)

            const result = {
                payload: filteredProducts.totalDocs,
                totalPages: filteredProducts.totalPages,
                prevPage: filteredProducts.prevPage,
                nextPage: filteredProducts.nextPage,
                page: filteredProducts.page,
                hasPrevPage: filteredProducts.hasPrevPage,
                hasNextPage: filteredProducts.hasNextPage,
                prevLink: filteredProducts.hasPrevPage ? `/products?page=${filteredProducts.prevPage}` : null,
                nextlink: filteredProducts.hasNextPage ? `/products?page=${filteredProducts.nextPage}` : null
            }
            /*
            let status = 'success'
            if (filteredProducts.docs.length == 0)
                status = 'error'
            let finalResult = {
                status,
                ...result
            }
            */

            // HTTP 200 OK
            //return res.sendSuccess(finalResult)
            return res.sendSuccess(result)
        }
        catch (err) {
            //return res.status(500).json({ error: err })
            return res.sendServerError(err)
        }
    }

    async getProductById(req, res) {
        try {
            const prodId = req.pid

            const product = await this.productsService.getProductById(prodId)
            if (!product) {
                return product === false
                    // HTTP 404 => el ID es válido, pero no se encontró ese producto
                    //res.status(404).json(`El producto con código '${prodId}' no existe.`)
                    ? res.sendNotFoundError(`El producto con código '${prodId}' no existe.`)
                    : res.sendServerError({ message: 'Something went wrong!' })
            }

            // HTTP 200 OK => se encontró el producto
            // res.status(200).json(product)
            res.sendSuccess(new ProductDTO(product))
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    async addProduct(req, res) {
        try {
            const user = req.session.user
            const newProduct = req.body

            // newProduct.thumbnail = [newProduct.thumbnail]
            newProduct.status = JSON.parse(newProduct.status)

            if (user.rol == ADMIN || user.rol == USER_PREMIUM) {
                //agregar el producto al productManager
                const createdProduct = await this.productsService.addProduct(newProduct.title,
                    newProduct.description,
                    newProduct.price,
                    newProduct.thumbnail,
                    newProduct.code,
                    newProduct.stock,
                    newProduct.status,
                    newProduct.category,
                    user.email)

                // //notificar a los demás browsers mediante WS
                // req.app.get('io').emit('newProduct', newProduct)

                // HTTP 201 OK => producto creado exitosamente
                // res.status(201).json(`El producto con código '${newProduct.code}' se agregó exitosamente.`)
                //res.sendCreated(`El producto con código '${newProduct.code}' se agregó exitosamente.`)
                // res.redirect('/allProducts')
                res.sendCreated(createdProduct._id)
            }
            else
                res.sendUnauthorizedError(`El usuario ${user.email} no tiene los permisos para crear productos.`)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    async updateProduct(req, res) {
        try {
            const user = req.session.user
            const prodId = req.pid
            const productUpdated = req.body

            const productActual = await this.productsService.getProductById(prodId)
            if (!productActual) {
                return productActual === false
                    // HTTP 404 => el ID es válido, pero no se encontró ese producto
                    //res.status(404).json(`El producto con código '${prodId}' no existe.`)
                    ? res.sendNotFoundError(`El producto con código '${prodId}' no existe.`)
                    : res.sendServerError({ message: 'Something went wrong!' })
            }
            //el owner del producto (solo si es PREMIUM), o el usuario ADMIN, pueden unicamente borrar productos
            if (((product.owner == user.email) && (user.rol == USER_PREMIUM)) || (user.rol == ADMIN)) {
                await this.productsService.updateProduct(productUpdated, prodId)
                
                // HTTP 200 OK => producto modificado exitosamente
                // res.status(200).json(productUpdated)
                res.sendSuccess(new ProductDTO(productUpdated))
            }
            else
                return res.sendUnauthorizedError(`El usuario ${user.email} no puede modificar el producto ${productActual.title} porque no es su owner.`)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }

    async deleteProduct(req, res) {
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
            //el owner del producto (solo si es PREMIUM), o el usuario ADMIN, pueden unicamente borrar productos
            if (((product.owner == user.email) && (user.rol == USER_PREMIUM)) || (user.rol == ADMIN)) {
                await this.productsService.deleteProduct(prodId)
                
                //en particular si soy PREMIUM debo enviar un email al dueño del producto
                if (user.rol == USER_PREMIUM) {
                    const title = 'Eliminación de producto'
                    const subject = 'Eliminación de un producto de la tienda'
                    const texto1 = `El producto con código '${prodId}' fue borrado de la tienda.`
                    const texto2 = `Tal acción fue realizada por el usuario '${user.email}'.`
                    this.usersService.notifyUser(user, title, subject, texto1, texto2)
                }

                // HTTP 200 OK => producto eliminado exitosamente
                // return res.status(200).json(`El producto con código '${prodId}' se eliminó exitosamente.`)
                return res.sendSuccess(`El producto con código '${prodId}' se eliminó exitosamente.`)
            }
            else
                return res.sendUnauthorizedError(`El usuario '${user.email}' no puede borrar el producto '${product.title}' porque no es su owner.`)
        }
        catch (err) {
            //return res.status(500).json({ message: err.message })
            return res.sendServerError(err)
        }
    }
}

module.exports = ProductsController