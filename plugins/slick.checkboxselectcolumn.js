(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "CheckboxSelectColumn": CheckboxSelectColumn
    }
  });


  function CheckboxSelectColumn(options) {
    var _grid;
    var _self = this;
    var _handler = new Slick.EventHandler();
    var _selectedRowsLookup = {};
    var _columnDefinitions = {};
    var _defaults = {
      columnId: "_checkbox_selector",
      cssClass: null,
      toolTip: "Select/Deselect All",
      width: 34
    };

    var _options = $.extend(true, {}, _defaults, options),
      handler = null;

    function init(grid) {
      _grid = grid;
      if (!_handler) {
        _handler = new Slick.EventHandler();
      }
      _handler
        .subscribe(_grid.onSelectedRowsChanged, handleSelectedRowsChanged)
        .subscribe(_grid.onClick, handleClick)
        .subscribe(_grid.onHeaderClick, handleHeaderClick)
        .subscribe(_grid.onKeyDown, handleKeyDown)
        .subscribe(_grid.onSelectTopRows, _manualSelectRows);
    }

    function destroy() {
      if (_handler) {
        _handler.unsubscribeAll();
        _handler = null;
      }
      _grid = null;
    }

    function handleSelectedRowsChanged(e, args) {
      $('.slick-cell input').each(function (index, target) {
        $(target).attr('disabled', true);
      });
      var selectedRows = _grid.getSelectedRows();
      var lookup = {}, row, i;
      for (i = 0; i < selectedRows.length; i++) {
        row = selectedRows[i];
        lookup[row] = true;
        if (lookup[row] !== _selectedRowsLookup[row]) {
          _grid.invalidateRow(row);
          delete _selectedRowsLookup[row];
        }
      }
      for (i in _selectedRowsLookup) {
        _grid.invalidateRow(i);
      }
      _selectedRowsLookup = lookup;
      _grid.render();
      clearTimeout(handler);
      handler = setTimeout(function () {
        $('.slick-cell input').each(function (index, target) {
          $(target).attr('disabled', false);
        });
      }, 50);

      if (_columnDefinitions.checkboxColumnName) {
        return;
      } else {
        if (selectedRows.length && selectedRows.length == _grid.getDataLength()) {
          _grid.updateColumnHeader(_options.columnId, "<input type='checkbox' checked='checked'>", _options.toolTip);
        } else {
          _grid.updateColumnHeader(_options.columnId, "<input type='checkbox'>", _options.toolTip);
        }
      }

    }

    function handleKeyDown(e, args) {
      if (e.which == 32) {
        if (_grid.getColumns()[args.cell].id === _options.columnId) {
          // if editing, try to commit
          if (!_grid.getEditorLock().isActive() || _grid.getEditorLock().commitCurrentEdit()) {
            toggleRowSelection(args.row);
          }
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }
    }

    function handleClick(e, args) {
      // clicking on a row select checkbox
      $('body').trigger('click.grid-popover'); // hide row menu

      if (_grid.getColumns()[args.cell].id === _options.columnId && $(e.target).is(":checkbox")) {
        // if editing, try to commit
        if (_grid.getEditorLock().isActive() && !_grid.getEditorLock().commitCurrentEdit()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }


        toggleRowSelection(args.row);
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }

    function toggleRowSelection(row, skipChart) {
      var item = _grid.getData().getItemByIdx(row);

      if (_selectedRowsLookup[row]) {
        _grid.setSelectedRows($.grep(_grid.getSelectedRows(), function (n) {
          return n != row;
        }));
        _grid.onManualSelectedRowsChanged.notify({row: item, checked: false, drawChart: skipChart});
      } else {
        _grid.setSelectedRows(_grid.getSelectedRows().concat(row));
        _grid.onManualSelectedRowsChanged.notify({row: item, checked: true, drawChart: skipChart});
      }

    }

    function _manualSelectRows(e, args) {
      // Reset all selection here
      _grid.onManualSelectedRowsChanged.notify({});
      if (Object.prototype.toString.call(args) === '[object Array]' && args.length > 0) {
        var isLast = false,
          item;
        for (var i = 0; i < args.length; i++) {
          item = _grid.getData().getItemByIdx(args[i]);
          _grid.onManualSelectedRowsChanged.notify({row: item, checked: true, drawChart: (i + 1 < args.length)});
        }
      }
    }

    function handleHeaderClick(e, args) {
      if (args.column.id == _options.columnId && $(e.target).is(":checkbox")) {
        // if editing, try to commit
        if (_grid.getEditorLock().isActive() && !_grid.getEditorLock().commitCurrentEdit()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }

        if ($(e.target).is(":checked")) {
          var rows = [];
          for (var i = 0; i < _grid.getDataLength(); i++) {
            rows.push(i);
          }
          _grid.setSelectedRows(rows);
        } else {
          _grid.setSelectedRows([]);
        }
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }

    function setColumnDefinition(id, value) {
      _columnDefinitions[id] = value;
    }
    function getColumnDefinition() {
      return {
        id: _options.columnId,
        name: _columnDefinitions.checkboxColumnName ? _columnDefinitions.checkboxColumnName : '<input type="checkbox">',
        toolTip: _options.toolTip,
        field: "sel",
        width: _options.width,
        resizable: false,
        sortable: false,
        cssClass: _options.cssClass,
        formatter: checkboxSelectionFormatter,
        pinned: true,
        groupable: false,
        header:  _columnDefinitions.header ? _columnDefinitions.header : null,
        filterable: false,
        additionalRenderer: _columnDefinitions.additionalRenderer ? _columnDefinitions.additionalRenderer : null,
        aggregatesFn: _columnDefinitions.aggregatesFn ? _columnDefinitions.aggregatesFn : null,
        deselectAll: _columnDefinitions.deselectAll ? _columnDefinitions.deselectAll : false,
        selectTop5: _columnDefinitions.selectTop5 ? _columnDefinitions.selectTop5 : false,
        selectTop10: _columnDefinitions.selectTop10 ? _columnDefinitions.selectTop10 : false,
        selectTop1000: _columnDefinitions.selectTop1000 ? _columnDefinitions.selectTop1000 : false
      };
    }

    function checkboxSelectionFormatter(row, cell, value, columnDef, dataContext) {
      if (dataContext) {
        if (dataContext.hasOwnProperty('_disableCheckbox') && dataContext._disableCheckbox === true) {
          return null;
        }
        var result = '';
        if (typeof getColumnDefinition().additionalRenderer === 'function') {
          var columns = _grid ? _grid.getColumns() : [],
            displayFields = [];
          for (var i = 0; i < columns.length; i++) {
            if (columns[i].hasOwnProperty('columnType') && columns[i].columnType === 'DisplayField' && dataContext.hasOwnProperty(columns[i].field)) {
              displayFields.push(dataContext[columns[i].field]);
            }
          }
          var value = displayFields.join('&nbsp;-&nbsp;');
          var id = angular.isDefined(dataContext._color) ? value : dataContext._i;
          result = getColumnDefinition().additionalRenderer(id, _selectedRowsLookup[row]);
        }

        return _selectedRowsLookup[row]
            ? result + "<input type='checkbox' checked='checked'>"
            : result + "<input type='checkbox'>";
      }
      return null;
    }

    $.extend(this, {
      "init": init,
      "destroy": destroy,
      "setColumnDefinition": setColumnDefinition,
      "getColumnDefinition": getColumnDefinition
    });
  }
})(jQuery);
