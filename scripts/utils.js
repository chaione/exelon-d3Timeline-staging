function _getLocationOrderForDelivery (deliveryId, workflows) {
  var deliveryWorkflows = _.filter(workflows, function (workflow) {
    return workflow.attributes.deliveryId === deliveryId
  })

  return _.map(deliveryWorkflows, function (workflow) {
    return parseInt(workflow.relationships.location.data.id)
  })
}

function _prepareEventsForRendering (events) {
  // take fully detailed events
  // expand to multiple POSTS
  // and get rid of unnecessary attributes
  // we only care about {timestamp, endtimestamp, responsible, yIndex}

  var responders = _.map(_POSTS, 'abbr')
  var simplifiedEvents = _.map(events, function (event) {
    return _.map(event.to, function (responder) {
      return {
        timestamp: event.timestamp,
        endTimestamp: event.endTimestamp,
        responsible: event.responsible,
        yIndex: _.indexOf(responders, responder),
        name: event.name
      }
    })
  })

  return _.flatten(simplifiedEvents)
}

function _getEPTFromWorkflow (workflow) {
  var locationName = utils.getLocationNameFromWorkflow(workflow)
  if (locationName === 'Sally Port') {
    var locationId = _.find(_DS.locations, {name: locationName}).id
    var subLocations = _.slice(workflow.locationOrder, 0, workflow.step - 1)

    if (_.includes(subLocations, locationId)) {
      return _.find(_DS.LOCATION_META, {name: 'SP Exit'}).epts
    }
  } 

  return _.find(_DS.LOCATION_META, {name: locationName}).epts
}

function _isDeliveryInLocation (delivery, locationName) {
  var currentWorkflow = utils.getCurrentWorkflow(delivery.values)
  return utils.getLocationNameFromRawDelivery(delivery) === locationName
}

function _getLocationAbbrFromLocationName (locationName) {
  return _.find(_DS.LOCATION_META, {name: locationName}).abbr
}

function _getLocationAbbrFromWorkflow (workflow) {
  var locationName = utils.getLocationNameFromWorkflow(workflow)
  return utils.getLocationAbbrFromLocationName(locationName)
}

function _getLocationNameFromRawDelivery (delivery) {
  var currentWorkflow = utils.getCurrentWorkflow(delivery.values)
  if (currentWorkflow.step === 1 && !currentWorkflow['started-at']) {
    return 'En Route'
  }
  return utils.getLocationNameFromWorkflow(currentWorkflow)
}

function _getLocationNameFromWorkflow (workflow) {
  var locationId = workflow.locationOrder[workflow.step - 1]

  return _.find(_DS.locations, {id: locationId}).name
}

function _getCurrentSubstep (workflow) {
  if (workflow['ended-at']) {
    return -1
  }
  
  if (!workflow['started-at']) {
    return 0
  }

  if (!workflow['nonsearch-end']) {
    return 1
  }

  if (!workflow['search-end']) {
    return 2
  }

  return 3
}

function _inSubstepLocation (workflow) {
  var locationName = utils.getLocationNameFromWorkflow(workflow)

  if (locationName === 'Sally Port') {
    var locationId = _.find(_DS.locations, {name: locationName}).id
    var subLocations = _.slice(workflow.locationOrder, 0, workflow.step - 1)

    return !_.includes(subLocations, locationId)
  }

  return _.includes(_HAS_SUBSTEP_LOCATIONS, locationName) 
}

function _getCurrentWorkflow (workflows) {
  return _.find(workflows, function (workflow, index) {
    if (index === 0) {
      return !workflow['ended-at']
    }

    if (index === (workflows.length - 1)) {
      return workflow['started-at']
    }

    return workflow['started-at'] && !workflow['ended-at']
  })
}

function _calculateDelay (startTime, endTime, EPT) {
  var difference = endTime - startTime
  if (difference <= EPT * 60000) {
    return 0
  } else {
    return difference - EPT
  }
}

function _detailCalculateDelay (delivery) {
  if (delivery.currentLocation.name === 'En Route') {
    if (delivery.eta && delivery.eta < _now) {
      return Math.round((_now.getTime() - currentWF.eta.getTime()) / 60000)
    }

    return 0
  }

  var totalDelay = _.reduce(delivery.values, function (sum, workflow, key) {
    if (!workflow['started-at']) {
      return sum
    }

    if (utils.inSubstepLocation(workflow)) {
      var subDelays = _.fill(Array(3), 0)

      if (workflow['ended-at']) {
        subDelays[0] = utils.calculateDelay(workflow['started-at'], workflow['nonsearch-end'], workflow.nonSearchEPT)
        subDelays[1] = utils.calculateDelay(workflow['nonsearch-end'], workflow['search-end'], workflow.searchEPT)
        subDelays[2] = utils.calculateDelay(workflow['search-end'], workflow['ended-at'], workflow.releaseEPT)
      } else {
        var currentSubStep = utils.getCurrentSubstep(workflow)
        console.log(currentSubStep)
        if (currentSubStep === 1) {
          subDelays[0] = utils.calculateDelay(workflow['started-at'], _now, workflow.nonSearchEPT)
          subDelays[1] = 0
          subDelays[2] = 0
        } else if (currentSubStep === 2) {
          subDelays[0] = utils.calculateDelay(workflow['started-at'], workflow['nonsearch-end'], workflow.nonSearchEPT)
          subDelays[1] = utils.calculateDelay(workflow['nonsearch-end'], _now, workflow.searchEPT)
          subDelays[2] = 0
        } else {
          subDelays[0] = utils.calculateDelay(workflow['started-at'], workflow['nonsearch-end'], workflow.nonSearchEPT)
          subDelays[1] = utils.calculateDelay(workflow['nonsearch-end'], workflow['search-end'], workflow.searchEPT)
          subDelays[2] = utils.calculateDelay(workflow['search-end'], _now, workflow.releaseEPT)
        }
      }
      return sum + _.sum(subDelays)
    } else {
      if (workflow['ended-at']) {
        var difference = workflow['ended-at'] - workflow['started-at']
      } else {
        var difference = _now - workflow['started-at']
      }

      if (difference < workflow.EPT * 60000) {
        return sum
      } else {
        return sum + difference - workflow.EPT * 60000
      }
    }
  }, 0)

  return Math.round(totalDelay / 1000 / 60)
}

function _calculateDelayState (startTime, endTime, estimated) {
  var difference = endTime - startTime
  estimated = estimated * 60000

  if (difference > estimated * (1 + _DS.AHEAD_OR_BEHIND_PCT)) {
    return 'late'
  } else if (difference < estimated * (1 - _DS.AHEAD_OR_BEHIND_PCT)) {
    return 'ahead'
  } else {
    return 'onTime'
  }
}

function _prepareSubStepEndTimes (workflow) {
  if (workflow['nonsearch-end'] && workflow['search-end']) {
    return
  }

  var totalTime = workflow['ended-at'].getTime() - workflow['started-at'].getTime()

  workflow['nonsearch-end'] = workflow['nonsearch-end'] || new Date(workflow['started-at'].getTime() + totalTime / 3)
  workflow['search-end'] = workflow['search-end'] || new Date(workflow['started-at'].getTime() + totalTime / 3 * 2)
}

function _cleanupLocationData (receivedLocations) {
  var locations = receivedLocations.map(function (location) {
    return {
      id: parseInt(location.id),
      name: location.attributes.name,
      abbr: _.find(_DS.LOCATION_META, {name: location.attributes.name}).abbr
    }
  })

  if (!_.find(locations, {name: 'En Route'})) {
    locations.splice(0, 0, {
      id: 0,
      name: 'En Route',
      abbr: 'ER'
    })
  }

  return _.sortBy(locations, function (location) {
    return _.findIndex(_DS.LOCATION_META, {name: location.name})
  })
}

function _getExitLocationId (stations) {
  return utils.getLocationIdFromLocationName('Exit', stations)
}

function _getLocationIdFromLocationName (locationName) {
  var location = _.find(_LOCATIONS, {name: locationName})
  if (location) {
    return parseInt(location.id)
  }

  return -1
}

function _getStaionIndexInStations (realStationId, stations) {
  return _.findIndex(stations, function (station) {
    return parseInt(_.keys(station)[0]) === parseInt(realStationId)
  })
}

function _getNullOrDate (dateString) {
  if (dateString) {
    return new Date(dateString)
  }

  return null
}

function _getPocNameById (pocId) {
  var poc = _pocsAPIData[pocId] || {}

  return 'POC ' + (poc['first-name'] || '') + ' ' + (poc['last-name'] || '')
}

function _getSubstepState (substep) {
  if (substep === 1) {
    return 'workflow late'
  }

  if (substep === -1) {
    return 'workflow ahead'
  }

  return 'workflow'
}

function isTimeBetweenTime (time, start, end) {
  return start <= time && time <= end
}

function _getVehicleIconSuffix (deliveryStatus, locationName) {
  if (locationName === 'En Route') {
    return 'enroute'
  }

  if (deliveryStatus === 'denied') {
    return 'denied'
  }

  return 'arrived'
}

function _getVehicleImageName (vehicleInfo, deliveryStatus, locationName) {
  var vehicleImageName = 'icn-'
  // icn- + type + axles + status + priority

  // special cases first
  if (_VEHICLE_TYPE_TO_IMG[vehicleInfo['vehicle-type']] === 'emergency') {
    vehicleImageName += utils.getVehicleIconSuffix(deliveryStatus, locationName)

    return vehicleImageName
  }

  if (_VEHICLE_TYPE_TO_IMG[vehicleInfo['vehicle-type']] === 'construction' ||
    _VEHICLE_TYPE_TO_IMG[vehicleInfo['vehicle-type']] === 'passnonIMP' ||
    _VEHICLE_TYPE_TO_IMG[vehicleInfo['vehicle-type']] === 'passIMP'
  ) {
    vehicleImageName += _VEHICLE_TYPE_TO_IMG[vehicleInfo['vehicle-type']] + '-'
    vehicleImageName += utils.getVehicleIconSuffix(deliveryStatus, locationName)

    if (vehicleInfo.priority) {
      vehicleImageName += '-pri'
    }

    return vehicleImageName
  }

  if (vehicleInfo.axles != null) {
    vehicleImageName += _VEHICLE_TYPE_TO_IMG[vehicleInfo['vehicle-type']] + '-' + vehicleInfo.axles + 'w-'
  } else if (vehicleInfo['vehicle-type']) {
    vehicleImageName += _VEHICLE_TYPE_TO_IMG[vehicleInfo['vehicle-type']] + '-' + 2 + 'w-'
  } else {
    vehicleImageName += 'common-2w-'
  }

  vehicleImageName += utils.getVehicleIconSuffix(deliveryStatus, locationName)

  if (vehicleInfo.priority) {
    vehicleImageName += '-pri'
  }

  return vehicleImageName
}

function _calculateWorkflowETAs (workflows) {
  var groupedWorkflows = _.groupBy(workflows, 'deliveryId')

  _.each(groupedWorkflows, function (subWorkflows, deliveryId) {
    var orderedWorkflows = _.orderBy(subWorkflows, 'step')

    _.each(orderedWorkflows, function (workflow, index) {

      if (index === 0) {
        // This isn't necessary in real situation
        // As first workflow should always have an ETA
        workflow.eta = workflow.eta || workflow['started-at'] || (_now.getTime() + _WORKFLOW_OFFSET)
      } else {
        if (!workflow.eta) {
          var lastWorkflow = orderedWorkflows[index - 1]
          var epts = utils.getEPTFromWorkflow(lastWorkflow)
          var totalEPT = 0

          if (utils.inSubstepLocation(lastWorkflow)) {
            var substep = utils.getCurrentSubstep(lastWorkflow)
            if (substep === 0) {
              totalEPT = _.sum(epts)
            } else {
              totalEPT = _.sum(_.slice(epts, substep - 1, epts.length))
            }
          } else {
            totalEPT = epts[0]
          }
          totalEPT = totalEPT * 60000

          if (lastWorkflow['started-at']) {
            if (lastWorkflow['ended-at']) {
              workflow.eta = lastWorkflow['ended-at']
            } else {
              workflow.eta = _now.getTime() + totalEPT
            }
          } else {
            workflow.eta = lastWorkflow.eta.getTime() + totalEPT
          }
        }
      }
      workflow.states= ['onTime']
      workflow.eta = new Date(workflow.eta)

      // Original ETA
      if (index === 0) {
        workflow.originalETA = new Date(workflow.eta) || _now
      } else {
        var previouseWorkflow = orderedWorkflows[index - 1]
        if (utils.inSubstepLocation(previouseWorkflow)) {
          workflow.originalETA = new Date(previouseWorkflow.originalETA.getTime() + (
            previouseWorkflow.nonSearchEPT + previouseWorkflow.searchEPT + previouseWorkflow.releaseEPT
          ) * 60000)
        } else {
          workflow.originalETA = previouseWorkflow.originalETA.getTime() + previouseWorkflow.EPT * 60000
        }

        workflow.originalETA = new Date(workflow.originalETA)
      }

      if (utils.inSubstepLocation(workflow)) {
        // var substep1State = utils.calculateDelayState(startedAt, nonsearchEnd, nonsearchEPT)
        // var substep2State = utils.calculateDelayState(nonsearchEnd, searchEnd, searchEPT)
        // var substep3State = utils.calculateDelayState(searchEnd, endedAt, releaseEPT)
      } else {
        var elapsedTime = 0
        if (workflow['started-at']) {
          if (workflow['ended-at']) {
            elapsedTime = workflow['ended-at'] - workflow['started-at']
          } else {
            elapsedTime = _now - workflow['started-at']
          }

          if (elapsedTime > workflow.EPT * 60000 * (1 + _DS.AHEAD_OR_BEHIND_PCT)) {
            workflow.states = ['late']
          } else if (elapsedTime < workflow.EPT * 60000 * (1 - _DS.AHEAD_OR_BEHIND_PCT)) {
            workflow.states = ['ahead']
          }
        } else {
          if (workflow.ETA < _now) {
            workflow.states['late']
          }
        }
      }
    })
  })

  return _.flatten(_.values(groupedWorkflows))
}

var utils = {
  getNullOrDate: _getNullOrDate,
  getPocNameById: _getPocNameById,
  getSubstepState: _getSubstepState,
  getVehicleImageName: _getVehicleImageName,
  calculateWorkflowETAs: _calculateWorkflowETAs,
  getExitLocationId: _getExitLocationId,
  getStaionIndexInStations: _getStaionIndexInStations,
  cleanupLocationData: _cleanupLocationData,
  prepareSubStepEndTimes: _prepareSubStepEndTimes,
  calculateDelayState: _calculateDelayState,
  detailCalculateDelay: _detailCalculateDelay,
  getCurrentWorkflow: _getCurrentWorkflow,
  inSubstepLocation: _inSubstepLocation,
  getLocationIdFromLocationName: _getLocationIdFromLocationName,
  getCurrentSubstep: _getCurrentSubstep,
  getLocationNameFromWorkflow: _getLocationNameFromWorkflow,
  getLocationNameFromRawDelivery: _getLocationNameFromRawDelivery,
  getLocationAbbrFromWorkflow: _getLocationAbbrFromWorkflow,
  getLocationAbbrFromLocationName: _getLocationAbbrFromLocationName,
  isDeliveryInLocation: _isDeliveryInLocation,
  getVehicleIconSuffix: _getVehicleIconSuffix,
  getEPTFromWorkflow: _getEPTFromWorkflow,
  calculateDelay: _calculateDelay,
  prepareEventsForRendering: _prepareEventsForRendering,
  getLocationOrderForDelivery: _getLocationOrderForDelivery,
}
