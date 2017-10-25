function noop() {
}
noop.$inject = [];

var nullFormCtrl = {
    $addControl: noop,
    $removeControl: noop,
    $setValidity: noop,
    $setDirty: noop,
    $setPristine: noop
};


var NgModelController = ['$scope', '$exceptionHandler', '$attrs', '$element', '$parse', '$animate', '$timeout',
    function ($scope, $exceptionHandler, $attr, $element, $parse, $animate, $timeout) {

        this.$viewValue = Number.NaN;
        this.$modelValue = Number.NaN;
        this.$parsers = [];
        this.$formaters = [];
        this.$viewChangeListeners = [];
        this.$pristine = true;
        this.$dirty = false;
        this.$valid = true;
        this.$invalid = false;
        this.$name = $attr.name;

        var ngModelGet = $parse($attr.ngModel),
            ngModelSet = ngModelGet.assign,
            pendingDebounce = null,
            ctrl = this;


        this.$render = noop;

        this.$isEmpty = function (value) {
            return isUndefined(value) || value === '' || value === null || value !== value;
        };

        var parentForm = $element.inheritedData('$formController') || nullFormCtrl,
            invalidCount = 0, // used to easily determine if we are valid
            $error = this.$error = {}; // keep invalid keys here

    }];