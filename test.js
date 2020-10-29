
// 建议阅读 [Promises/A+ 标准](https://promisesaplus.com/)

const STATUS = {
  PENDING: 'PENDING',
  FULFILLED: 'FULFILLED',
  REJECTED: 'REJECTED'
}

function resolvePromise(x, promise2, resolve, reject) {
  if (x === promise2) {
    throw new TypeError('chaining cycle error')
  }

  if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
    let called
    try {
      let then = x.then
      if (typeof then === 'function') {
        then.call(x, function (y) {
          if (called) return
          called = true
          resolvePromise(y, promise2, resolve, reject)
        }, function (r) {
          if (called) return
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
    resolve(x)
  }
}

class Promise {
  constructor(executor) {
    this.status = STATUS.PENDING;
    this.value = undefined
    this.reason = undefined
    this.onResolvedCallbacks = []
    this.onRejectedCallbacks = []

    const resolve = (val) => {
      if (this.status === STATUS.PENDING) {
        this.status = STATUS.FULFILLED
        this.value = val
        this.onResolvedCallbacks.forEach(fn => fn())
      }
    }
    const reject = (reason) => {
      if (this.status === STATUS.PENDING) {
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
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : x => x
    onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err }

    let promise2 = new Promise((resolve, reject) => {
      if (this.status === STATUS.FULFILLED) {
        setTimeout(() => {
          try {
            let x = onFulfilled(this.value)
            resolvePromise(x, promise2, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      }

      if (this.status === STATUS.REJECTED) {
        setTimeout(() => {
          try {
            let x = onRejected(this.reason)
            resolvePromise(x, promise2, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0);
      }

      if (this.status === STATUS.PENDING) {
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
          }, 0);
        })
      }
    })

    return promise2
  }
}

Promise.defer = Promise.deferred = () => {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}


module.exports = Promise
