import uuid from 'uuid'

const noop = function () { }
const parameters = {
  requestDataType: 'Capture',
  eventDataType: 'Event',
  sessionDataType: 'Session',
  isRunning: false,
  sessionId: null,
  requestId: null,
  pageLoadCounter: 0,
  eventCounter: 0,
  macId: null,
  workspace: null,
  sessionSending: false,
  sessionSended: false,
  utmcsr: null,
  utmcmd: null,
  utmctr: null,
  userToken: null,
  vtexjanushash: null,
  isNewSession: false,
  isNewUser: false,
  macIdCookie: 'VtexRCMacIdv7',
  workspaceCookie: 'vtex_workspace',
  utmzCookie: '__utmz',
  appVersionCookie: 'vtexjanushash',
  sessionIdCookie: 'VtexRCSessionIdv7',
  requestCounterCookie: 'VtexRCRequestCounter',
  vtexIdCookie: 'VtexIdclientAutCookie',
  wereEventsCaptured: false,
  sessionSendCount: 0,
}
const version = '7.0'
const endpoint = '//rc.vtex.com.br'
const port = ':80'
const securePort = ':443'

// Start Timing Capture
function sendPerformanceData () {
  setTimeout(function () {
    try {
      var timingRequest = {}
      timingRequest.DataType = 'Timing'
      timingRequest.Url = location.href()
      timingRequest.HostName = location.hostname()
      timingRequest.Ref = location.referrer()
      timingRequest.Path = location.path()

      if (typeof performance === 'object') {
        var t = performance.timing
        timingRequest.NetworkingTime = t.responseStart - t.navigationStart
        timingRequest.DomProcessingTime = t.domContentLoadedEventEnd - t.responseStart
        timingRequest.PageRenderingTime = t.loadEventEnd - t.domContentLoadedEventEnd
      }
      timingRequest.WereEventsCaptured = parameters.wereEventsCaptured
      timingRequest.SessionId = parameters.sessionId
      timingRequest.Workspace = parameters.workspace
      timingRequest.UserToken = parameters.userToken
      timingRequest.MacId = parameters.macId
      timingRequest.vtexjanushash = parameters.vtexjanushash

      submitRequest('GET', timingRequest)
    } catch (e) {
      sendErrorEvent(e)
    }
  }, 0)
}
// End Timing Capture

function getVtexCookie (checkName) {
  if (window.HashId !== undefined && window.HashId !== '') {
    return window.HashId
  }
  var allCookies = document.cookie.split(';')
  var tempCookie = ''
  var cookieName = ''
  var cookieValue = ''
  var cookieFound = false
  for (let i = 0; i < allCookies.length; i++) {
    tempCookie = allCookies[i].split('=')
    cookieName = tempCookie[0].replace(/^\s+|\s+$/g, '')
    if (cookieName === checkName) {
      cookieFound = true
      if (tempCookie.length > 1) {
        cookieValue = ''
        for (var j = 1; j < tempCookie.length; j++) {
          if (cookieValue !== '') {
            cookieValue += '='
          }
          cookieValue += tempCookie[j]
        }
        cookieValue = unescape(cookieValue.replace(/^\s+|\s+$/g, ''))
      }
      return cookieValue
    }
    tempCookie = null; cookieName = ''
  }
  if (!cookieFound) {
    return ''
  }
}

function setVtexCookie (cookieName, cookieValue, duration) {
  var today = new Date()
  var expire = new Date()
  expire.setTime(today.getTime() + duration)
  var host = location.hostname()
  host = host.substring(host.indexOf('.') + 1, host.length)
  document.cookie = cookieName + '=' + escape(cookieValue) + ';expires=' + expire.toGMTString() + '; path=/; domain=' + host
}

function sendErrorEvent ({message}) {
  var errorRequest = {}
  errorRequest.DataType = 'Error'
  errorRequest.Url = location.href()
  errorRequest.HostName = location.hostname()
  errorRequest.Ref = location.referrer()
  errorRequest.Path = location.path()
  errorRequest.SessionId = parameters.sessionId
  errorRequest.ErrorMessage = message
  submitRequest('GET', errorRequest)
}

function createNavigationIDs () {
  try {
    generateSessionID()
    generateRequestID()
    getCampaignDataFromUTM()
    getSiteVersionHash()
    getMacID()
    getWorkspaceId()
    definePageLoadCounter()
    getUserToken()
  } catch (e) {
    sendErrorEvent(e)
  }
}

function subscribeToDomEvents () {
  if (window.attachEvent) {
    window.attachEvent('onload', sendPerformanceData)
  } else if (window.addEventListener) {
    window.addEventListener('load', sendPerformanceData, false)
  }

  if (window.history && window.history.pushState) {
    var pushState = window.history.pushState
    window.history.pushState = function () {
      sendHashChange()
      return pushState.apply(window.history, arguments)
    }
  }

  if (window.attachEvent) {
    window.attachEvent('onhashchange', sendHashChange)
  } else if (window.addEventListener) {
    window.addEventListener('hashchange', sendHashChange, false)
  }
}

function generateSessionID (callback = noop) {
  var sessionId = getVtexCookie(parameters.sessionIdCookie)
  if ((sessionId === null || sessionId === '' || sessionId.length < 36)) {
    sessionId = uuid.v1()
    parameters.isNewSession = true
  } else {
    var ssIdParts = sessionId.split(':')
    if (ssIdParts.length > 1) {
      var hasSendFlag = ssIdParts[0] === '1'
      parameters.sessionSended = hasSendFlag
      sessionId = ssIdParts[1]
    } else {
      sessionId = ssIdParts[0]
    }
  }
  setVtexCookie(parameters.sessionIdCookie, (parameters.sessionSended ? '1' : '0') + ':' + sessionId, 1800000)
  parameters.sessionId = sessionId

  const message = parameters.isNewSession ? 'Created Session: ' : 'Restored Session: '
  return callback(null, 'GenerateSessionID', message + parameters.sessionId)
}

function generateRequestID (callback = noop) {
  parameters.requestId = uuid.v1()
  return callback(null, 'GenerateRequestID', 'Created Request: ' + parameters.requestId)
}

function getMacID (callback = noop) {
  var macId = getVtexCookie(parameters.macIdCookie)
  var isNewMac = (macId === null || macId === '' || macId.length < 36)
  if (isNewMac) {
    parameters.isNewUser = true
    macId = uuid.v1()
  }
  setVtexCookie(parameters.macIdCookie, macId, 315360000000)
  parameters.macId = macId

  const message = isNewMac ? 'Created Mac: ' : 'Restored Mac: '
  return callback(null, 'GetMacID', message + parameters.macId)
}

function getWorkspaceId () {
  parameters.workspace = getVtexCookie(parameters.workspaceCookie)
}

function getCampaignDataFromUTM () {
  try {
    var utmz = getVtexCookie(parameters.utmzCookie)
    if (utmz !== null) {
      var pairs = utmz.split('.').slice(4).join('.').split('|')
      var ga = {}
      for (var i = 0; i < pairs.length; i++) {
        var temp = pairs[i].split('=')
        ga[temp[0]] = temp[1]
      }
      parameters.utmcsr = ga.utmcsr
      parameters.utmcmd = ga.utmcmd
      parameters.utmctr = ga.utmctr
    }
  } catch (e) {
    sendErrorEvent(e)
  }
}

function getSiteVersionHash () {
  try {
    var versionCookie = getVtexCookie(parameters.appVersionCookie)
    if (versionCookie !== null) {
      parameters.vtexjanushash = versionCookie
    }
  } catch (e) {
    sendErrorEvent(e)
  }
}

function getUserToken () {
  try {
    var authCookie = getVtexCookie(parameters.vtexIdCookie)
    if (authCookie !== null) {
      parameters.userToken = authCookie
    }
  } catch (e) {
    sendErrorEvent(e)
  }
}

function definePageLoadCounter (callback = noop) {
  parameters.pageLoadCounter = getVtexCookie(parameters.requestCounterCookie)
  if (!IsNumber(parameters.pageLoadCounter)) {
    parameters.pageLoadCounter = 0
  }
  parameters.pageLoadCounter = parseInt(parameters.pageLoadCounter) + 1
  setVtexCookie(parameters.requestCounterCookie, parameters.pageLoadCounter, 1800000)
  return callback(null, 'DefinePageLoadCounter', 'Request Number: ' + parameters.pageLoadCounter)
}
// End Definition Section

function prepareRequestObject (name, data) {
  // prepare the request to send it to the server
  var requestData = {}
  if (name === 'BeginLoad' || name === 'Load' || name === 'Submit') {
    requestData.DataType = parameters.requestDataType
    requestData.CustomFields = data
  } else {
    requestData.DataType = parameters.eventDataType
    for (var key in data) {
      requestData[key] = data[key]
    }
  }
  try {
    if (data !== null) {
      requestData.Id = parameters.sessionId
      requestData.SessionId = parameters.sessionId
      requestData.Workspace = parameters.workspace
      requestData.MacId = parameters.macId
      requestData.vtexjanushash = parameters.vtexjanushash
      requestData.RequestType = name
      requestData.RCVersion = version
      requestData.PageLoadCount = parameters.pageLoadCounter
      requestData.EventCount = parseInt(parameters.eventCounter) + 1
      requestData.Url = location.href()
      requestData.Ref = location.referrer()
      requestData.Path = location.path()
      requestData.HostName = location.hostname()
      requestData.Utmcmd = parameters.utmcmd
      requestData.Utmcsr = parameters.utmcsr
      requestData.Utmctr = parameters.utmctr
      requestData.SaveSession = !parameters.sessionSended
      requestData.IsNewUser = parameters.isNewUser
    }
  } catch (e) {
    sendErrorEvent(e)
  }
  return requestData
}

function submitRequest (verb, navigationData, callback) {
  var jsonString = JSON.stringify(navigationData)
  var jsonStringUtf8 = encodeURIComponent(jsonString)
  var url = prepareUrl()

  if (verb === 'POST') {
    sendBeaconRequest(url + '/api/events', jsonString, callback)
  } else {
    sendBeaconRequest(url + '?d=' + jsonStringUtf8, '', callback)
  }
}

function sendHashChange () {
  try {
    var hashChangeRequest = {}
    hashChangeRequest.DataType = 'HashChange'
    hashChangeRequest.Url = location.href()
    hashChangeRequest.HostName = location.hostname()
    hashChangeRequest.Ref = location.referrer()
    hashChangeRequest.Path = location.path()
    hashChangeRequest.SessionId = parameters.sessionId
    hashChangeRequest.Workspace = parameters.workspace
    hashChangeRequest.UserToken = parameters.userToken
    hashChangeRequest.MacId = parameters.macId
    hashChangeRequest.vtexjanushash = parameters.vtexjanushash

    submitRequest('GET', hashChangeRequest)
  } catch (e) {
    sendErrorEvent(e)
  }
}

function prepareUrl () {
  return location.protocol() + endpoint + (location.protocol() === 'https:' ? securePort : port)
}

function sendBeaconRequest (url, body, callback) {
  try {
    var xhrObj = getXHRObject()
    if (xhrObj) {
      if (body) {
        xhrObj.open('POST', url, true)
        xhrObj.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
      } else {
        xhrObj.open('GET', url, true)
      }
      var requestTimeOut = setTimeout(function () {
        xhrObj.abort()
      }, 3000)
      xhrObj.onreadystatechange = function (respAr) {
        var readyState = (respAr && typeof (respAr.readyState) !== 'undefined' ? respAr.readyState : xhrObj.readyState)
        if (readyState === 4 && xhrObj.status === 204) {
          clearTimeout(requestTimeOut)
          if (typeof callback === 'function') {
            callback(false)
          }
        } else if (readyState === 4 && xhrObj.status === 0) {
          if (typeof callback === 'function') {
            callback(true)
          }
        }
      }
      xhrObj.send(body)
    }
  } catch (e) {
    sendErrorEvent(e)
  }
}

function getXHRObject () {
  var xhrObj = false
  try {
    xhrObj = new XMLHttpRequest()
  } catch (e) {
    var progid = ['MSXML2.XMLHTTP.5.0', 'MSXML2.XMLHTTP.4.0', 'MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP', 'Microsoft.XMLHTTP']
    for (var i = 0; i < progid.length; ++i) {
      try {
        xhrObj = new window.ActiveXObject(progid[i])
      } catch (e) {
        sendErrorEvent(e)
      }
    }
  }
  return xhrObj
}

const location = {
  href: function () {
    return window.location.href
  },
  referrer: function () {
    return window.document.referrer
  },
  protocol: function () {
    return window.location.protocol
  },
  path: function () {
    return window.location.pathname
  },
  hostname: function () {
    return window.location.hostname
  },
}

function IsNumber (value) {
  return !isNaN(parseFloat(value)) && isFinite(value)
}

function run () {
  try {
    if (!parameters.isRunning) {
      createNavigationIDs()
      subscribeToDomEvents()
    }
  } catch (e) {
    sendErrorEvent(e)
  }
}

export function sendEvent (name, data = {}, verb = 'GET') {
  try {
    parameters.wereEventsCaptured = true
    var navigationData = prepareRequestObject(name, data)
    submitRequest(verb, navigationData, function (error) {
      if (!parameters.sessionSended && !error) {
        setVtexCookie(parameters.sessionIdCookie, '1:' + parameters.sessionId, 1800000)
      }
    })
  } catch (e) {
    sendErrorEvent(e)
  }
}

if (
	typeof window !== 'undefined' &&
	window.document &&
	window.document.createElement
) {
  run()
}
