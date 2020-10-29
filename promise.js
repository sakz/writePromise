// 建议阅读 [Promises/A+ 标准](https://promisesaplus.com/)

const STATUS = {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    REJECTED: 'REJECTED'
}

function resolvePromise(x, promise2, resolve, reject) {
    // If promise and x refer to the same object, reject promise with a TypeError as the reason.
    if (x === promise2) { // 防止自己等待自己完成
        throw new TypeError('Chaining cycle detected for promise')
    }
    if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
        let called
        try {
            let then = x.then
            if (typeof then === 'function') {
                then.call(x, function (y) { // 调用返回的promise 用他的结果 作为下一次then的结果
                    if (called) return
                    called = true
                    // 递归解析成功后的值 直到他是一个普通值为止
                    resolvePromise(y, promise2, resolve, reject)
                }, function (r) {
                    if (called) return;
                    called = true
                    reject(r)
                })
            } else {
                resolve(x)
            }
        } catch (e) {
            if (called) return
            called = true
            reject(e)
        }
    } else {
        resolve(x) // x是一个原始类型
    }
}

class Promise {
    constructor(executor) {
        this.status = STATUS.PENDING
        this.value = undefined
        this.reason = undefined
        this.onResolvedCallbacks = [] // 存放成功的回调
        this.onRejectedCallbacks = [] // 存放失败的回调
        const resolve = (val) => {

            if (val instanceof Promise) { // 是promise 就继续递归解析
                return val.then(resolve, reject)
            }

            if (this.status == STATUS.PENDING) {
                this.status = STATUS.FULFILLED
                this.value = val
                this.onResolvedCallbacks.forEach(fn => fn())
            }
        }
        const reject = (reason) => {
            if (this.status == STATUS.PENDING) {
                this.status = STATUS.REJECTED
                this.reason = reason
                this.onRejectedCallbacks.forEach(fn => fn())
            }
        }
        try {
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }
    then(onFulfilled, onRejected) {
        // 可选参数
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : x => x
        onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err }

        let promise2 = new Promise((resolve, reject) => {
            if (this.status == STATUS.FULFILLED) {
                setTimeout(() => {
                    try {
                        let x = onFulfilled(this.value)
                        resolvePromise(x, promise2, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                }, 0)
            }
            if (this.status == STATUS.REJECTED) {
                setTimeout(() => {
                    try {
                        let x = onRejected(this.reason)
                        resolvePromise(x, promise2, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                }, 0)
            }
            if (this.status == STATUS.PENDING) {
                // 装饰模式 切片编程
                this.onResolvedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onFulfilled(this.value)
                            resolvePromise(x, promise2, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0)
                })
                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason)
                            resolvePromise(x, promise2, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0)
                })
            }
        })
        return promise2
    }
    catch(err) { // 默认只有成功没有失败
        return this.then(null, err)
    }
    static resolve(val) {
        return new Promise((resolve, reject) => {
            resolve(val)
        })
    }
    static reject(reason) {
        return new Promise((resolve, reject) => {
            reject(reason)
        })
    }
}

Promise.all = (promises) => {
    return new Promise((resolve, reject) => {
        // promises是一个可迭代对象, 转成数组, mdn文档
        // Promise.all('121212').then(res => console.log(res))
        // 输出 ["1", "2", "1", "2", "1", "2"]
        promises = [...promises]

        let len = promises.length
        let counter = 0
        let result = []
        for (let i = 0; i < len; i++) {
            Promise.resolve(promise[i]).then(function (value) {
                result[i] = value
                count++
                if (counter === len) {
                    resolve(result)
                }
            }, function (reason) {
                reject(reason)
            })
        }
    })
}

// https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally
// finally() 方法返回一个Promise。在promise结束时，无论结果是fulfilled或者是rejected，都会执行指定的回调函数。
Promise.prototype.finally = function (callback) {
    return this.then(data => {
        return Promise.resolve(callback()).then(() => data)
    }, err => {
        return Promise.resolve(callback()).then(() => {
            throw err
        })
    })
}

// 测试时会调用此方法
Promise.defer = Promise.deferred = function () {
    let dfd = {
    }
    dfd.promise = new Promise((resolve, reject) => {
        dfd.resolve = resolve
        dfd.reject = reject
    })
    return dfd
}

module.exports = Promise