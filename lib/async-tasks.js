
"use strict"

var error = require('quiver-error').error
var safeCallback = require('quiver-safe-callback').safeCallback

var callTask = function(task, callback) {
  var wrappedCallback = safeCallback(function(err) {
    var result = Array.prototype.slice.call(arguments, 1)
    if(result.length <= 1) result = result[0]

    callback(err, result)
  })

  process.nextTick(function() {
    task(wrappedCallback)
  })
}

var parallelTask = function(keys, tasks, errorStore, resultStore, callback) {
  var errorOccured = false
  var taskCount = keys.length
  var resultCount = 0

  var finalizeCallback = function() {
    var err = errorOccured ? error(500, 'error executing parallel tasks', errorStore) : null

    callback(err, resultStore)
  }

  keys.forEach(function(key) {
    var task = tasks[key]

    callTask(task, function(err, result) {
      if(err) {
        errorOccured = true
        errorStore[key] = err
      }

      resultStore[key] = result

      resultCount++
      if(resultCount == taskCount) finalizeCallback()
    })
  })
}

var seriesTask = function(keys, tasks, errorStore, resultStore, callback) {
  var errorOccured = false
  var taskCount = keys.length

  var finalizeCallback = function() {
    var err = errorOccured ? error(500, 'error executing parallel tasks', errorStore) : null

    callback(err, resultStore)
  }

  var callNextTask = function(i) {
    var key = keys[i]
    var task = tasks[key]

    callTask(task, function(err, result) {
      if(err) {
        errorOccured = true
        errorStore[key] = err
      }

      resultStore[key] = result
      if(i+1 == taskCount) return finalizeCallback()

      callNextTask(i+1)
    })
  }
  callNextTask(0)
}

var createMapVarient = function(asyncTaskFunction) {
  return function(taskMap, callback) {
    var keys = Object.keys(taskMap)

    var errorMap = { }
    var resultMap = { }

    asyncTaskFunction(keys, taskMap, errorMap, resultMap, callback)
  }
}

var createArrayVarient = function(asyncTaskFunction) {
  return function(taskArray, callback) {
    var resultArray = []
    var errorArray = []

    var keys = []
    for(var i=0; i<taskArray.length; i++) {
      keys[i] = i
    }

    asyncTaskFunction(keys, taskArray, errorArray, resultArray, callback)
  }
}

var parallelMap = createMapVarient(parallelTask)
var parallelArray = createArrayVarient(parallelTask)
var seriesMap = createMapVarient(seriesTask)
var seriesArray = createArrayVarient(seriesTask)

module.exports = {
  parallelMap: parallelMap,
  parallelArray: parallelArray,
  seriesMap: seriesMap,
  seriesArray: seriesArray
}