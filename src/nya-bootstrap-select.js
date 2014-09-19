/**
 * @license nya-bootstrap-select v2.0.0+alpha001
 * Copyright 2014 nyasoft
 * Licensed under MIT license
 */

(function(){
  'use strict';

  /**
   * @param {*} obj
   * @return {boolean} Returns true if `obj` is an array or array-like object (NodeList, Arguments,
   *                   String ...)
   */
  function isArrayLike(obj) {
    if (obj == null || isWindow(obj)) {
      return false;
    }

    var length = obj.length;

    if (obj.nodeType === 1 && length) {
      return true;
    }

    return isString(obj) || isArray(obj) || length === 0 ||
      typeof length === 'number' && length > 0 && (length - 1) in obj;
  }

  /**
   * Creates a new object without a prototype. This object is useful for lookup without having to
   * guard against prototypically inherited properties via hasOwnProperty.
   *
   * Related micro-benchmarks:
   * - http://jsperf.com/object-create2
   * - http://jsperf.com/proto-map-lookup/2
   * - http://jsperf.com/for-in-vs-object-keys2
   *
   * @returns {Object}
   */
  function createMap() {
    return Object.create(null);
  }

  /**
   * Computes a hash of an 'obj'.
   * Hash of a:
   *  string is string
   *  number is number as string
   *  object is either result of calling $$hashKey function on the object or uniquely generated id,
   *         that is also assigned to the $$hashKey property of the object.
   *
   * @param obj
   * @returns {string} hash string such that the same input will have the same hash string.
   *         The resulting string key is in 'type:hashKey' format.
   */
  function hashKey(obj, nextUidFn) {
    var objType = typeof obj,
      key;

    if (objType == 'function' || (objType == 'object' && obj !== null)) {
      if (typeof (key = obj.$$hashKey) == 'function') {
        // must invoke on object to keep the right this
        key = obj.$$hashKey();
      } else if (key === undefined) {
        key = obj.$$hashKey = (nextUidFn || nextUid)();
      }
    } else {
      key = obj;
    }

    return objType + ':' + key;
  }

  function sortByGroup(array ,group, property) {
    var length = array.length,
      resultArray = new Array(length),
      i, o, j,
      indexInGroup;
    for(i = 0; i < length; i++) {
      o = array[i][property];

      indexInGroup = group.indexOf(o);
      resultArray[i] = array[i];
      resultArray[i].$$groupIndex = indexInGroup;
    }

    // use insertion sort because the source array is almost sorted.

  }

  angular.module('nya.bootstrap.select',[])
    .controller('nyaBsSelectCtrl', ['$scope', function($scope){
      var self = this;

    }])
    .directive('nyaBsSelect', ['$parse', function ($parse) {

      var DROPDOWN_TOGGLE = '<button class="btn dropdown-toggle">' +
        '<span class="pull-left filter-option"></span>' +
        '<span class="caret"></span>' +
        '</button>';

      var DROPDOWN_MENU = '<ul class="dropdown-menu"></ul>';

      return {
        restrict: 'ECA',
        scope: true,
        require: ['ngModel', 'nyaBsSelect'],
        controller: 'nyaBsSelectCtrl',
        compile: function(tElement, tAttrs){
          tElement.addClass('btn-group');
          var options = tElement.children().detach();
          var dropdownToggle = angular.element(DROPDOWN_TOGGLE);
          var dropdownMenu = angular.element(DROPDOWN_MENU);
          dropdownMenu.append(options);
          tElement.append(dropdownToggle);
          tElement.append(dropdownMenu);
          return function(scope, element, attrs, ctrls) {
            var BS_ATTR = ['container', 'countSelectedText', 'dropupAuto', 'header', 'hideDisabled', 'selectedTextFormat', 'size', 'showSubtext', 'showIcon', 'showContent', 'style', 'title', 'width', 'disabled'];
            var ngCtrl = ctrls[0];
            var nyaBsSelectCtrl = ctrls[1];
            scope.$watch(attrs.bsOptions, function(options) {
              if(angular.isUndefined(options)) {
                return;
              }
              nyaBsSelectCtrl.bsOptions = options;
            }, true);
          };
        }
      };
    }])
    .directive('nyaBsOption', ['$parse', function($parse){

                            //00000011111111111111100000000022222222222222200000003333333333333330000000000000004444444444000000000000000000055555555550000000000000000000006666666666000000
      var BS_OPTION_REGEX = /^\s*(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/;

      return {
        restrict: 'A',
        transclude: 'element',
        priority: 1000,
        terminal: true,
        require: '^nyaBsSelect',
        compile: function nyaBsOptionCompile (tElement, tAttrs) {
          var expression = tAttrs.nyaBsSelect;
          var match = expression.match(BS_OPTION_REGEX);

          if(!match) {
            throw new Error('invalid expression');
          }

          var valueIdentifier = match[3] || match[1],
            keyIdentifier = match[2],
            collectionExp = match[4],
            groupByExpGetter = $parse(match[5] || ''),
            trackByExp = match[4];

          var trackByIdArrayFn,
            trackByIdObjFn,
            trackByIdExpFn,
            trackByExpGetter;
          var hashFnLocals = {$id: hashKey};
          var groupByFn, locals;

          if(trackByExp) {
            trackByExpGetter = $parse(trackByExp);
          } else {
            trackByIdArrayFn = function(key, value) {
              return hashKey(value);
            };
            trackByIdObjFn = function(key) {
              return key;
            };
          }
          return function nyaBsOptionLink($scope, $element, $attr, ctrl, $transclude) {
            if(trackByExpGetter) {
              trackByIdExpFn = function(key, value, index) {
                // assign key, value, and $index to the locals so that they can be used in hash functions
                if (keyIdentifier) {
                  hashFnLocals[keyIdentifier] = key;
                }
                hashFnLocals[valueIdentifier] = value;
                hashFnLocals.$index = index;
                return trackByExpGetter($scope, hashFnLocals);
              };
            }

            if(groupByExpGetter) {
              groupByFn = function(key, value) {
                if(keyIdentifier) {
                  locals[keyIdentifier] = key;
                }
                locals[valueIdentifier] = value;
                return groupByExpGetter($scope, locals);
              }
            }

            // Store a list of elements from previous run. This is a hash where key is the item from the
            // iterator, and the value is objects with following properties.
            //   - scope: bound scope
            //   - element: previous element.
            //   - index: position
            //
            // We are using no-proto object so that we don't need to guard against inherited props via
            // hasOwnProperty.
            var lastBlockMap = createMap();

            $scope.$watch(collectionExp, function nyaBsOptionAction(collection) {
              var index, length,
                key, value,
                trackById,
                trackByIdFn,
                collectionKeys,
                collectionLength,
                // Same as lastBlockMap but it has the current state. It will become the
                // lastBlockMap on the next iteration.
                nextBlockMap = createMap(),
                nextBlockOrder,
                block,
                groupName, groupIndex, groupLength,
                group,
                lastGroupIndex;

              if(groupByFn) {
                group = [];
              }

              if(isArrayLike(collection)) {
                collectionKeys = collection;
                trackByIdFn = trackByIdExpFn || trackByIdArrayFn;
              } else {
                trackByIdFn = trackByIdExpFn || trackByIdObjFn;
                // if object, extract keys, sort them and use to determine order of iteration over obj props
                collectionKeys = [];
                for (var itemKey in collection) {
                  if (collection.hasOwnProperty(itemKey) && itemKey.charAt(0) != '$') {
                    collectionKeys.push(itemKey);
                  }
                }
                collectionKeys.sort();
              }

              collectionLength = collectionKeys.length;
              nextBlockOrder = new Array(collectionLength);

              for(index = 0; index < collectionLength; index++) {
                key = (collection === collectionKeys) ? index : collectionKeys[index];
                value = collection[key];
                trackById = trackByIdFn(key, value, index);

                if(groupByFn) {
                  groupName = groupByFn(key, value);
                  if(group.indexOf(groupName) === -1 && groupName) {
                    group.push(groupName);
                  }
                }

                if(lastBlockMap[trackById]) {
                  // found previously seen block
                  block = lastBlockMap[trackById];
                  delete lastBlockMap[trackById];
                  nextBlockMap[trackById] = block;
                  nextBlockOrder[index] = block
                } else if(nextBlockMap[trackById]) {
                  //if collision detected. restore lastBlockMap and throw an error
                  forEach(nextBlockOrder, function(block) {
                    if(block && block.scope) {
                      lastBlockMap[block.id] = block;
                    }
                  });
                  throw new Error("Duplicates in a select are not allowed. Use 'track by' expression to specify unique keys.");
                } else {
                  // new never before seen block
                  nextBlockOrder[index] = {id: trackById, scope: undefined, clone: undefined};
                  nextBlockMap[trackById] = true;
                  if(groupName) {
                    nextBlockOrder[index].group = groupName;
                  }
                }
              }

              // only resort nextBlockOrder when group found
              if(group && group.length > 0) {

                groupLength = group.length;
                lastGroupIndex = 0;

                for(groupIndex = 0; groupIndex < groupLength; groupLength++) {
                  groupName = group[groupIndex];
                  for(index = 0; index < collectionLength; index++) {
                    if(nextBlockOrder[index].group === groupName) {

                    }
                  }
                }
              }
            });
          };
        }
      }
    }]);

})();
