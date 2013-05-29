
var should = require('should')
var error = require('quiver-error').error
var async = require('../lib/async-tasks')

describe('async parallel tests', function() {
  var createTasks = function() {
    var task1 = function(callback) {
      callback(error(500, 'first error'), 'first result')
    }

    var parallelCallbacks = []
    var task23 = function(callback) {
      parallelCallbacks.push(callback)
      if(parallelCallbacks.length == 2) {
        parallelCallbacks[0](null, 'second result')
        parallelCallbacks[1](null, 'third result')
      } else if(parallelCallbacks.length > 2) {
        throw new Error('should be called only twice')
      }
    }

    var task4 = function(callback) {
      callback(null, 'fourth result')
    }

    return [task1, task23, task23, task4]
  }

  it('parallel map test', function(callback) {
    var tasks = createTasks()
    async.parallelMap({
      first: tasks[0],
      second: tasks[1],
      third: tasks[2],
      fourth: tasks[3]
    }, function(err, results) {
      should.exist(err)

      err.previousError.first.errorMessage.should.equal('first error')

      results.first.should.equal('first result')
      results.second.should.equal('second result')
      results.third.should.equal('third result')
      results.fourth.should.equal('fourth result')

      callback()
    })
  })

  it('parallel array test', function(callback) {
    var tasks = createTasks()

    async.parallelArray(tasks, function(err, results) {

      should.exist(err)

      err.previousError[0].errorMessage.should.equal('first error')

      results[0].should.equal('first result')
      results[1].should.equal('second result')
      results[2].should.equal('third result')
      results[3].should.equal('fourth result')

      callback()
    })
  })
})

describe('async series test', function() {
  var createTasks = function() {
    var firstCalled = false

    var task1 = function(callback) {
      setTimeout(function() {
        firstCalled = true
        callback(null, 'first result')
      }, 100)
    }

    var task2 = function(callback) {
      firstCalled.should.equal(true)
      callback(null, 'second result')
    }

    var task3 = function(callback) {
      callback(error(500, 'third error'))
    }

    return [task1, task2, task3]
  }

  it('series map test', function(callback) {
    var tasks = createTasks()

    async.seriesMap({
      first: tasks[0],
      second: tasks[1],
      third: tasks[2]
    }, function(err, results) {
      should.exist(err)

      err.previousError.third.errorMessage.should.equal('third error')

      results.first.should.equal('first result')
      results.second.should.equal('second result')
      should.not.exist(results.third)

      callback()
    })
  })

  it('series array test', function(callback) {
    var tasks = createTasks()

    async.seriesArray(tasks, function(err, results) {
      should.exist(err)

      err.previousError[2].errorMessage.should.equal('third error')

      results[0].should.equal('first result')
      results[1].should.equal('second result')
      should.not.exist(results[2])

      callback()
    })
  })
})