


// Same as Promise.all but always returns an array of results even if some of them rejected
// Resolved promises fulfill to their resolved value
// Rejected promises fulfull to undefined
// Taken from https://davidwalsh.name/promises-results
let promiseAll = function(arr) {
    return Promise.all(arr.map( p => p.catch(() => undefined)))
}


module.exports = {
  promiseAll: promiseAll,
}
