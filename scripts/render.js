/* global _ */
function moveXAxis (a, b) {
  var eventxTranslation = d3.event.translate[0]
  var eventyTranslation = d3.event.translate[1]
  if (eventyTranslation < panBounds.bottom) {
    eventyTranslation = panBounds.bottom
    xAxisTranslation.translate([eventxTranslation, eventyTranslation])
  }
  if (eventyTranslation > panBounds.top) {
    eventyTranslation = panBounds.top
    xAxisTranslation.translate([eventxTranslation, eventyTranslation])
  }

  if (eventxTranslation < panBounds.left) {
    eventxTranslation = panBounds.left
    xAxisTranslation.translate([eventxTranslation, eventyTranslation])
  }

  if (eventxTranslation > panBounds.right) {
    eventxTranslation = panBounds.right
    xAxisTranslation.translate([eventxTranslation, eventyTranslation])
  }

  if (_DS.isDetailDisplayed) {
    eventyTranslation = previousYTranslation
  }
  previousYTranslation = eventyTranslation
  detailStartingX = eventxTranslation

  deliveriesGroup.attr('transform', 'translate(' + [eventxTranslation, eventyTranslation] + ')scale(1)')

  stationsGroup.attr('transform', 'translate(' + [0, eventyTranslation] + ')scale(1)')
  delieveryStaticGroup.attr('transform', 'translate(' + [0, eventyTranslation] + ')scale(1)')

  xAxisGroup.attr('transform', 'translate(' + [eventxTranslation, innerHeight] + ')scale(1)')
  if (_DS.isDetailDisplayed) {
    detailDeliveryDataGroup.attr('transform', 'translate(' + [eventxTranslation, detailDeliveryRectY] + ')scale(1)')
  }
}

function render (data) {
  console.log('rendering...........')

  outerWidth = document.documentElement.clientWidth
  outerHeight = document.documentElement.clientHeight - 83

  innerWidth = outerWidth - margin.left - margin.right
  innerHeight = outerHeight - margin.top - margin.bottom

  var lastLocation = _.last(_DS.locations)
  _locationHeight = rowHeight * (lastLocation.y0 * + lastLocation.deliveryCount)

  panBounds = {
    top: 0,
    right: 0,
    bottom: (-1 * _locationHeight * 2) + innerHeight - _X_AXIS_HEIGHT,
    left: (-1 * _X_AXIS_WIDTH) + outerWidth
  }

  // clear it out (for now... hope to just update some day!)
  svg.remove()
  setupSvgStructure()

  // Setup stations overlay and text
  var stationsLabelSelectAll = stationsGroup.selectAll('.station').data(_DS.locations)
  var stationsLabelSelectAllG = stationsLabelSelectAll.enter().append('g').attr('class', 'station') // stations should never exit

  stationsLabelSelectAllG.append('rect').attr('class', 'stationRect')
  var stationsLabelStationRectSelectAll = stationsLabelSelectAll.selectAll('.stationRect')

  stationsLabelStationRectSelectAll
    .attr('x', function (d, i) { return 0 })
    .attr('y', function (d, i) { return d.y0 * rowHeight + (rowHeight / 2) })
    .attr('width', innerWidth)
    .attr('height', function (d, i) { return d.deliveryCount * rowHeight })

  stationsLabelSelectAllG.append('text')
    .attr('x', function (d, i) { return stationTextPadding.left;})
    .attr('y', function (d, i) { return d.y0 * rowHeight + (rowHeight / 2) + stationTextHeight + stationTextPadding.top;})
    .text(function (d) {return d.name})
    .attr('class', 'name')
    .attr('font-size', stationTextHeight + 'px')

  stationsLabelSelectAll.selectAll('.deliveryBGStatuss') // denying entry bg
    .data(_.filter(_deliveryIndexInfo, {status: 'denied'}))
    .enter()
    .append('rect')
    // .attr("xlink:href",function(i){
    //     return "img/icn-timeline-denied-small.png"
    // })
    .attr('height', rowHeight)
    .attr('width', outerWidth)
    .attr('class', 'deniedEntry')
    // .attr("preserveAspectRatio","none")
    // .attr("fill","url(#deniedEntryGradient)")
    .attr('x', 0)
    .attr('y', 0)
    .attr('transform', function (d) {return 'translate(' + 0 + ',' + (yDeliveryScale(d.yIndex + 1) - rowHeight / 2) + ')'})

  var delieveryStaticGroupSelectAll = delieveryStaticGroup.selectAll('.deliveryStatuss') // denying entry text
    .data(_deliveryIndexInfo)
    .enter()
    .append('text')
    .attr('x', function (d, i) { return outerWidth - 20 })
    .attr('y', function (d, i) { return yDeliveryScale(d.yIndex + 1) + 6 }) // why is the 6 needed???
    .text(function (d, i) {
      if (d.status === 'denied') {
        return '!! DENYING ENTRY !!'
      } else {
        return ''
      }
    })
    .attr('class', 'deliveryStatuss denied')
    .attr('text-anchor', 'end')
    .attr('font-size', stationTextHeight + 'px')

  // Setup axis
  xAxisGroup.call(xAxis)
  yAxisGroup.append('line')
    .attr('class', 'yAxis')
    .attr('x1', xScale(_now))
    .attr('y1', margin.top)
    .attr('x2', xScale(_now))
    .attr('y2', Math.max(_locationHeight + _X_AXIS_HEIGHT, outerHeight))

  yAxisGroup.append('rect')
    .attr('x', xScale(_now) - (120 / 2))
    .attr('y', 0)
    .attr('width', 120)
    .attr('height', 16)
    .attr('class', 'yAxisDateTimeBox')
  yAxisGroup.append('text')
    .attr('x', xScale(_now))
    .attr('y', 13)
    .attr('text-anchor', 'middle')
    .text(function (d, i) {
      return (nowMonth + 1) + '.' + nowDay + '.' + nowYear + ' // ' + nowHours + '.' + nowMinutes
    })
    .attr('class', 'yAxisDateTimeText')
    .attr('font-size', 14 + 'px')
  yAxisGroup.append('svg:path')
    .attr('d', function (d) {
      return customShapes['dBook'](4)
    })
    .attr('class', 'yAxisDateTimeArrow')
    .attr('transform', function (d) {
      return 'translate(' + xScale(_now) + ',' + 16 + ')'
    })

  // Setup Stations
  var stationsSelectAll = deliveriesGroup.selectAll('.station')
    .data(data, function (d) {
      return d.key
    })
  stationsSelectAll.enter().append('g').attr('class', function (d)  {
    return 'station ' + d.key
  })
  stationsSelectAll.exit().remove()

  // Setup Deliveries
  var deliveriesSelectAll = stationsSelectAll.selectAll('.delivery').data(function (d) {
    return d.values
  })

  // The delivery group
  var deliveriesSelectAllG = deliveriesSelectAll.enter().append('g').attr('class', function (d) {
    return 'delivery ' + d.key
  })

  deliveriesSelectAllG
    .attr('transform', function (d) {
      return 'translate(' + 0 + ',' + yDeliveryScale(d.yIndex + 1) + ')'
    })

  // Setup Workflows
  var workflowsSelectAll = deliveriesSelectAllG.selectAll('.workflow')
    .data(function (d) {
      return d.values
    })
  var prevData = {}
  var workflowsSelectAllG = workflowsSelectAll.enter().append('g')
  // workflowsSelectAll.exit().remove()
  workflowsSelectAllG
    .each(function (d, i) {
      var workflow = d3.select(this)
      workflow = appendWorkflow(workflow, d)

      if (d.step === 1 && d.eta < d['started-at']) {
        prependEtaLine(workflow, d)
      }

      if (i > 0 && d['started-at'] !== null && prevData['ended-at'] !== null) {
        appendLineBetweenPorts(workflow, d, prevData)
      }

      prevData = d
    })

  var vehicleIconsG = deliveriesSelectAllG.append('g')
  // setup Vehicle Icons
  vehicleIconsG.append('image')
    .attr('xlink:href', function (i) {
      return 'img/' + i.vehicleType + '.png'
    })
    .attr('height', vehicleShapeH)
    .attr('width', vehicleShapeH)
    .attr('x', -1 * (vehicleShapeH / 2))
    .attr('y', -1 * (vehicleShapeH / 2))
    .attr('class', 'truckIconDiamond')
    .attr('transform', function (d) {return 'translate(' + xScale(_now) + ',' + 0 + ')'})
    .on('click', function (delivery) {
      displayDetail(delivery)
    })

  var communicationSelectAll = deliveriesSelectAllG.selectAll('.communicationLine')
    .data(function (d) {
      return _.filter(_DS.events, {deliveryId: d.key})
    })

  var communicationGroup = communicationSelectAll
    .enter()
    .append('line')
    .each(function (event) {
      var eventItem = d3.select(this)
      if (event.endTimestamp) {
        eventItem
          .attr('x1', function (event, i) {
            return xScale(event.timestamp.getTime())
          })
          .attr('y1', 10)
          .attr('x2', function (event, i) {
            return xScale(event.endTimestamp.getTime())
          })
          .attr('y2', 10)
          .attr('class', 'communicationLine')
          .style('stroke-dasharray', ('1, 1'))
      }
    })
}

// RENDER HELPERS
function prependEtaLine (firstWorkflow, d) {
  console.log('prepending eta line')
  console.log(d)
  console.log(d['eta'])
  console.log(d['arrived-at'])

  firstWorkflow.append('line')
    .attr('x1', function (d, i) { return xScale(d['eta']); })
    .attr('y1', function (d, i) { return 0;})
    .attr('x2', function (d, i) { return xScale(d['arrived-at']); })
    .attr('y2', function (d, i) { return 0;})
    .attr('class', 'workflow late ghostline')

  firstWorkflow.append('svg:path')
    .attr('d', function (d) { return customShapes['lBook'](4);})
    .attr('class', 'bookEnd notReached ghost')
    .attr('transform', function (d) {
      return 'translate(' + xScale(d['eta']) + ',' + 0 + ')'
    })
}

function appendLineBetweenPorts (workflowD3, workflow, lastWorkflow) {
  workflowD3.append('line')
    .attr('x1', function (d, i) {
      return xScale(workflow['started-at'])
    })
    .attr('y1', function (d, i) { return 0 })
    .attr('x2', function (d, i) {
      return xScale(lastWorkflow['ended-at'])
    })
    .attr('y2', function (d, i) { return 0 })
    .attr('class', 'workflow betweenPorts')
}

function appendWorkflow (workflow, d) {
  var startedAt = d['started-at']
  var endedAt = d['ended-at']

  var searchEnd = d['search-end']
  var nonsearchEnd = d['nonsearch-end']

  var epts = utils.getEPTFromWorkflow(d)
  var nonsearchEPT = epts[0]
  var searchEPT = epts[1]
  var releaseEPT = epts[2]
  var EPT = epts[0]

  var oneMinute = 1000 * 60

  if (utils.inSubstepLocation(d)) { // Has Substeps--------------------------------------------------------------
    if (startedAt === null && endedAt === null) { // workflow hasnt started yet
      workflow.append('line') // nonsearch notreached
        .attr('x1', function (d, i) {
          return xScale(
            d.eta.getTime() // + _currentDeliveryDelayById[d.deliveryId] * 60000
          )
        })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) {
          return xScale(
            d.eta.getTime() + nonsearchEPT * oneMinute - 60000 // + _currentDeliveryDelayById[d.deliveryId] * 60000
          )
        })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', 'workflow nonsearch notReached 1-3-1 ' + d.deliveryId)

      workflow.append('line') // search notreached
        .attr('x1', function (d, i) {
          return xScale(
            d.eta.getTime() + nonsearchEPT * oneMinute // + _currentDeliveryDelayById[d.deliveryId] * 60000
          )
        })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) {
          return xScale(
            d.eta.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute - 60000 // + _currentDeliveryDelayById[d.deliveryId] * 60000
          )
        })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', 'workflow search notReached 1-3-1 ' + d.deliveryId)

      workflow.append('line') // release notreached
        .attr('x1', function (d, i) {
          return xScale(
            d.eta.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute // + _currentDeliveryDelayById[d.deliveryId] * 60000
          )
        })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) {
          return xScale(
            d.eta.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute + releaseEPT * oneMinute - 60000 // + _currentDeliveryDelayById[d.deliveryId] * 60000
          )
        })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', 'workflow release notReached 1-3-1 ' + d.deliveryId)
    } else if (startedAt !== null && endedAt === null) { // current workflow
      workflow = appendCurrentWorkflowWithSubsteps(workflow, d)
    } else if (startedAt !== null && endedAt !== null) { // completed workflow
      utils.prepareSubStepEndTimes(d)
      searchEnd = d['search-end']
      nonsearchEnd = d['nonsearch-end']

      var substep1State = utils.calculateDelayState(startedAt, nonsearchEnd, nonsearchEPT)
      var substep2State = utils.calculateDelayState(nonsearchEnd, searchEnd, searchEPT)
      var substep3State = utils.calculateDelayState(searchEnd, endedAt, releaseEPT)

      workflow.append('line')
        .attr('x1', function (d, i) {
          return xScale(new Date(startedAt).getTime())
        })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) { return xScale(nonsearchEnd - 60000) })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', function (d) {
          return 'workflow ' + substep1State
        })

      workflow.append('line') // substep 2
        .attr('x1', function (d, i) { return xScale(nonsearchEnd) })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) { return xScale(searchEnd - 60000) })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', function (d) {
          return 'workflow ' + substep2State
        })

      workflow.append('line')
        .attr('x1', function (d, i) { return xScale(searchEnd) })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) { return xScale(endedAt) })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', function (d) {
          return 'workflow ' + substep3State
        })

      workflow.append('svg:path')
        .attr('d', function (d) { return customShapes['lBook'](4);})
        .attr('class', function (d) {
          if (startedAt < _now) {
            return 'bookEnd notReached'
          }
        })
        .attr('transform', function (d) {
          return 'translate(' + xScale(new Date(startedAt)) + ',' + 0 + ')'
        })

      workflow.append('svg:path')
        .attr('d', function (d) { return customShapes['rBook'](4);})
        .attr('class', function (d) {
          if (endedAt < _now) {
            return 'bookEnd notReached'
          }
        })
        .attr('transform', function (d) {
          return 'translate(' + xScale(endedAt) + ',' + 0 + ')'
        })
    }
  } else { // Does not have substeps -------------------------------------------------------------------------
    if (startedAt !== null && endedAt !== null) { // completed workflow
      workflow.append('line')
        .attr('x1', function (d, i) { return xScale(startedAt.getTime()) })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) { return xScale(endedAt.getTime()) })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', function (d) {
          if (d.state === 'late') {
            return 'workflow late'
          } else if (d.state === 'early') {
            return 'workflow ahead'
          } else {
            return 'workflow'
          }
        })

      workflow.append('svg:path')
        .attr('d', function (d) { return customShapes['lBook'](4);})
        .attr('class', function (d) {
          if (startedAt < _now) {
            return 'bookEnd notReached'
          }
        })
        .attr('transform', function (d) {
          return 'translate(' + xScale(startedAt) + ',' + 0 + ')'
        })

      workflow.append('svg:path')
        .attr('d', function (d) { return customShapes['rBook'](4);})
        .attr('class', function (d) {
          if (endedAt < _now) {
            return 'bookEnd notReached'
          }
        })
        .attr('transform', function (d) {
          return 'translate(' + xScale(endedAt) + ',' + 0 + ')'
        })
    } else if (startedAt !== null && endedAt === null) { // current workflow
      // leftside of now
      workflow.append('line')
        .attr('x1', function (d, i) {
          return xScale(startedAt.getTime())
        })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) {
          return xScale(_now.getTime())
        })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', function (d) {
          if (d.state === 'late') {
            return 'workflow late'
          } else if (d.state === 'early') {
            return 'workflow ahead'
          } else {
            return 'workflow'
          }
        })

      workflow.append('svg:path')
        .attr('d', function (d) { return customShapes['lBook'](4);})
        .attr('class', function (d) {
          if (startedAt < _now) {
            return 'bookEnd notReached'
          }
        })
        .attr('transform', function (d) {
          return 'translate(' + xScale(new Date(startedAt)) + ',' + 0 + ')'
        })

      // on right side of now
      workflow.append('line')
        .attr('x1', function (d, i) { return xScale(_now.getTime()) })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) {
          return xScale(
            _now.getTime() + EPT * oneMinute - 60000
          )
        })
        .attr('y2', function (d, i) { return .001 }) // IMPORTANT  if its flat its not displayed
        .style('stroke-dasharray', ('2, 2'))
        .style('stroke-width', 4)
        .attr('class', function (d) {
          if (d.state === 'late') {
            return 'workflow lateGradient'
          }

          if (d.state === 'early') {
            return 'workflow aheadGradient'
          }

          return 'workflow onTimeGradient'
        })
    } else if (startedAt === null && endedAt === null) { // workflow hasnt started yet
      workflow.append('line')
        .attr('x1', function (d, i) {
          return xScale(
            d.eta.getTime() // + _currentDeliveryDelayById[d.deliveryId] * 60000
          )
        })
        .attr('y1', function (d, i) { return 0 })
        .attr('x2', function (d, i) {
          return xScale(
            d.eta.getTime() + EPT * oneMinute - 60000 //+ _currentDeliveryDelayById[d.deliveryId] * 60000
          )
        })
        .attr('y2', function (d, i) { return 0 })
        .attr('class', 'workflow notReached ' + d.deliveryId)
    }
  }

  return workflow
}

function appendCurrentWorkflowWithSubsteps (currentWorkflow, d) {
  var startedAt = d['started-at']
  var nonsearchEnd = d['nonsearch-end']
  var searchEnd = d['search-end']
  var endedAt = d['ended-at']

  var epts = utils.getEPTFromWorkflow(d)
  var nonsearchEPT = epts[0]
  var searchEPT = epts[1]
  var releaseEPT = epts[2]
  var EPT = epts[0]

  var oneMinute = 1000 * 60

  // left side of now
  var currentSubStep = utils.getCurrentSubstep(d)

  if (currentSubStep === 1) {
    currentWorkflow.append('line')
      .attr('x1', function (d, i) {
        return xScale(startedAt.getTime())
      })
      .attr('y1', function (d, i) { return 0 })
      .attr('x2', function (d, i) { return xScale(_now.getTime()) })
      .attr('y2', function (d, i) { return .001 })
      .attr('class', function (d) {
        var state = utils.calculateDelayState(d['started-at'], _now, d.nonSearchEPT)
        return 'workflow ' + state
      })

    // on right side of now
    currentWorkflow.append('line')
      .attr('x1', function (d, i) {
        return xScale(_now.getTime())
      })
      .attr('y1', function (d, i) { return 0 })
      .attr('x2', function (d, i) {
        return xScale(
          _now.getTime() + nonsearchEPT * oneMinute - 60000
        )
      })
      .attr('y2', function (d, i) { return .001 }) // IMPORTANT  if its flat its not displayed
      .style('stroke-dasharray', ('2, 2'))
      .style('stroke-width', 4)
      .attr('class', function (d) {
        var state = utils.calculateDelayState(d['started-at'], _now, d.nonSearchEPT)
        return 'workflow ' + state + 'Gradient'
      })

    currentWorkflow.append('line') // search notreached
      .attr('x1', function (d, i) {
        return xScale(
          _now.getTime() + nonsearchEPT * oneMinute
        )
      })
      .attr('y1', 0)
      .attr('x2', function (d, i) {
        return xScale(
          _now.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute - 60000
        )
      })
      .attr('y2', 0.01)
      .style('stroke-dasharray', ('2, 2'))
      .style('stroke-width', 4)
      .attr('class', function (d) {
        var estimated = d['started-at'].getTime() + (nonsearchEPT + searchEPT) * 60000
        if (estimated < _now) {
          return 'workflow lateGradient'
        } else {
          return 'workflow onTimeGradient'
        }
      })

    currentWorkflow.append('line') // release notreached
      .attr('x1', function (d, i) {
        return xScale(
          _now.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute
        )
      })
      .attr('y1', 0)
      .attr('x2', function (d, i) {
        return xScale(
          _now.getTime() + _.sum(epts) * oneMinute - 60000
        )
      })
      .attr('y2', 0.01)
      .style('stroke-dasharray', ('2, 2'))
      .style('stroke-width', 4)
      .attr('class', function (d) {
        var estimated = d['started-at'].getTime() + (nonsearchEPT + searchEPT + releaseEPT) * 60000
        if (estimated < _now) {
          return 'workflow lateGradient'
        } else {
          return 'workflow onTimeGradient'
        }
      })
  } else if (currentSubStep === 2) {
    var substep1State = utils.calculateDelayState(startedAt, nonsearchEnd, nonsearchEPT)
    currentWorkflow.append('line') // substep 1 complted
      .attr('x1', function (d, i) { return xScale(startedAt); })
      .attr('y1', function (d, i) { return 0;})
      .attr('x2', function (d, i) { return xScale(nonsearchEnd - 60000); })
      .attr('y2', function (d, i) { return 0;})
      .attr('class', function (d) {
        return 'workflow ' + substep1State
      })

    currentWorkflow.append('line') // part of substep 2 (that was is being completed)
      .attr('x1', function (d, i) { return xScale(nonsearchEnd); })
      .attr('y1', function (d, i) { return 0;})
      .attr('x2', function (d, i) { return xScale(_now); })
      .attr('y2', function (d, i) { return 0;})
      .attr('class', function (d) {
        var estimated = nonsearchEnd.getTime() + searchEPT * 60000
        if (estimated < _now) {
          return 'workflow late'
        } else {
          return 'workflow onTime'
        }
      })

    // on right side of now
    currentWorkflow.append('line') // future end of substep 2
      .attr('x1', function (d, i) { 
        return xScale(_now)
      })
      .attr('y1', function (d, i) { return 0;})
      .attr('x2', function (d, i) { 
        return xScale(
          _now.getTime() + searchEPT * oneMinute - 60000
        )
      })
      .attr('y2', function (d, i) { return .001;}) // IMPORTANT  if its flat its not displayed
      .style('stroke-dasharray', ('2, 2'))
      .style('stroke-width', 4)
      .attr('class', function (d) {
        var estimated = d['started-at'].getTime() + (nonsearchEPT + searchEPT) * 60000
        if (estimated < _now) {
          return 'workflow lateGradient'
        } else {
          return 'workflow onTimeGradient'
        }
      })

    currentWorkflow.append('line') // release notreached
      .attr('x1', function (d, i) { 
        return xScale(
          _now.getTime() + searchEPT * oneMinute
        )
      })
      .attr('x2', function (d, i) { 
        return xScale(
          _now.getTime() + (searchEPT + releaseEPT) * oneMinute - 60000
        )
      })
      .attr('y2', function (d, i) { return 0;})
      .attr('class', 'workflow notReached')

  } else if (currentSubStep === 3) {
    var substep1State = utils.calculateDelayState(startedAt, nonsearchEnd, nonsearchEPT)
    var substep2State = utils.calculateDelayState(nonsearchEnd, searchEnd, searchEPT)
    currentWorkflow.append('line') // substep 1
      .attr('x1', function (d, i) {
        return xScale(startedAt.getTime())
      })
      .attr('y1', function (d, i) { return 0 })
      .attr('x2', function (d, i) {
        return xScale(nonsearchEnd - 60000)
      })
      .attr('y2', function (d, i) { return 0;})
      .attr('class', function (d) {
        return 'workflow ' + substep1State
      })

    currentWorkflow.append('line') // substep 2
      .attr('x1', function (d, i) { return xScale(nonsearchEnd); })
      .attr('y1', function (d, i) { return 0;})
      .attr('x2', function (d, i) { return xScale(searchEnd - 60000); })
      .attr('y2', function (d, i) { return 0;})
      .attr('class', function (d) {
        return 'workflow ' + substep2State
      })

    currentWorkflow.append('line') // part of step 3 done
      .attr('x1', function (d, i) { return xScale(searchEnd); })
      .attr('y1', function (d, i) { return 0 })
      .attr('x2', function (d, i) { return xScale(_now); })
      .attr('y2', function (d, i) { return 0 })
      .attr('class', function (d) {
        var estimated = d['search-end'].getTime() + releaseEPT * 60000
        if (estimated < _now) {
          return 'workflow late'
        } else {
          return 'workflow onTime'
        }
      })

    // on right side of now
    currentWorkflow.append('line')
      .attr('x1', function (d, i) { return xScale(_now.getTime()) })
      .attr('y1', function (d, i) { return 0 })
      .attr('x2', function (d, i) {
        return xScale(_now.getTime() + EPT * oneMinute)
      })
      .attr('y2', function (d, i) { return .001 })
      .style('stroke-dasharray', ('2, 2'))
      .style('stroke-width', 4)
      .attr('class', function (d) {
        var estimated = d['search-end'].getTime() + releaseEPT * 60000
        if (estimated < _now) {
          return 'workflow lateGradient'
        } else {
          return 'workflow onTimeGradient'
        }
      })
  }

  currentWorkflow.append('svg:path') // LEFT BOOKEND IS AT BOTTOM SO IT DISPLAYS ON TOP
    .attr('d', function (d) {
      return customShapes['lBook'](4)
    })
    .attr('class', function (d) {
      if (startedAt < _now) {
        return 'bookEnd notReached'
      }
    })
    .attr('transform', function (d) {
      return 'translate(' + xScale(new Date(startedAt)) + ',' + 0 + ')'
    })

  return currentWorkflow
}
