;
(function ($) {
  window.xTree = function (options) {
    return new tree(options);
  };

  // if (!Array.prototype.indexOf) {
  //   Array.prototype.indexOf = function (obj, start) {
  //     for (var i = (start || 0), j = this.length; i < j; i++) {
  //       if (this[i] === obj) {
  //         return i;
  //       }
  //     }
  //     return -1;
  //   }
  // }

  var defOpt = {
    dom: '', //jqueryDom
    position: 'absolute',
    is_trigger: false, //是否需要触发? 否则直接显示
    lazyLoad: false,
    lazyLoadUrl: '',
    has_search: false,
    has_buttons: false,
    searchType: 'all', //'all'全部，'node'节点，'leaf'叶子
    only_child: false, //是否结果只要 child
    node_merge: false, //结果只显示最上层  比如   中国被选中  四川,成都则不会显示  否则 每个被勾选的节点都显示
    zIndex: 99,
    is_multi: true, //是否多选
    radioCancel: false, // 单选，再次点击则取消选中。
    expand: false, //是否展开，false、true、num, (0、false,都展开ROOT级。true,完全展开。num>=1时，展开到对应级）
    width: null,
    minWidth: 200,
    maxHeight: 300,
    data: [], //{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
    sel_ids: '',
    onBeforeInit: function () {},
    onInit: function () {},
    onBeforeOpen: function () {},
    onOpen: function () {},
    onBeforeClose: function () {},
    onClose: function () {},
    onExpand: function () {},
    onCheck: function () {},
    onCancel: function () {},
    onChange: function () {},
    onConfirm: function () {},
  };
  var defState = {
    _initialized: false, //是否初始化完成。
    _is_open: false, //是否open。
    _originId: {
      nodeId: [],
      id: []
    }, //上次打开时候选中了哪一些id
    _searchTimer: '' //搜索框的定时器
  };

  var tree = function (opt) {
    this._init(opt);
    return this;
  };

  tree.prototype = {
    _init: function (opt) {
      var res = this._validateOpt(opt);
      if (!res) {
        return false;
      }

      this.opt = $.extend(true, {}, defOpt, opt);
      this.dom = this.opt.dom;
      this.arrayData = this.opt.data;
      this.state = $.extend({}, defState);

      this.treeData = this._arrayToTree(this.arrayData);
      this.tree = this._makeTree(this.treeData);

      if (this.opt.position === 'fixed') {
        $('body').append(this.tree.$dom);
      } else {
        this.dom.css({
          'position': 'relative'
        });
        this.dom.append(this.tree.$dom);
      }

      if (this.opt.sel_ids) {
        if (this.opt.is_multi) {
          this._checkTreeByIds(this.treeData, this.opt.sel_ids);
        } else {
          this._checkDataRadio(this.arrayData, this.opt.sel_ids);
        }
      }

      this.opt.onInit.call(this);
      this.state._initialized = true;

      var that = this;
      if (this.opt.is_trigger) {
        this.dom.off('click.xTree');
        this.dom.on('click.xTree', function (e) {
          if (that.state._is_open && !that.tree.$dom.is(e.target) && that.tree.$dom.has(e.target).length === 0) {
            that.hide();
          } else {
            that.show();
          }
        });
        $(document).on('click.xTree', function (e) {
          var a = that.dom;
          var b = that.tree.$dom;
          if (!a.is(e.target) && a.has(e.target).length === 0 && !b.is(e.target) && b.has(e.target).length === 0) {
            that.hide();
          }
        });
      } else {
        that.show();
      }
    },

    /**
     *      方法
     *
     */
    show: function () {
      this.opt.onBeforeOpen.call(this);
      this._showTree();
      this.state._is_open = true;
      this.opt.onOpen.call(this);
    },
    hide: function () {
      if (this.state._is_open) {
        this.opt.onBeforeClose.call(this);
        this._hideTree();
        this.state._originId = this.getId();
        this.state._is_open = false;
        this.opt.onClose.call(this);
      }
    },
    open: this.show,
    close: this.hide,

    getId: function () {
      var ids = [];
      var items = this.getItem();

      if (items.length > 0) {
        items.forEach(function (element) {
          ids.push(element.id);
        }, this);
      }
      return ids;
    },

    getName: function () {
      var names = [];
      var items = this.getItem();

      if (items.length > 0) {
        items.forEach(function (element) {
          names.push(element.name);
        }, this);
      }
      return names.join();
    },

    getItem: function () {
      var items = [];
      var data = this.arrayData;
      if (this.opt.only_child) {
        $.each(data, function (i, n) {
          if (n.is_check === true && n.is_node === false) {
            items.push(n);
          }
        });
      } else if (this.opt.node_merge) {
        var nodeIds = [];
        $.each(data, function (i, n) {
          if (n.is_check && n.is_node) {
            nodeIds.push(n.id);
          }
        });
        var clone = $.extend(false, [], data);
        $.each(clone, function (i, n) {
          if (($.inArray(n.nodeId, nodeIds) != -1) || !n.is_check) {
            clone[i] = null;
          }
        });
        $.each(clone, function (i, n) {
          if (n) {
            items.push(n);
          }
        });
      } else {
        $.each(data, function (i, n) {
          if (n.is_check) {
            items.push(n);
          }
        });
      }
      return items;
    },

    getIds: function (type) {
      var ids = {}
      var items = this.getItems(type);

      for (key in items) {
        ids[key] = [];
        if (items.hasOwnProperty(key) && items[key].length > 0) {
          items[key].forEach(function (element) {
            ids[key].push(element.id);
          }, this);
        }
      }
      return ids;
    },

    getNames: function (type) {
      var names = {};
      var items = this.getItems(type);

      for (key in items) {
        names[key] = [];
        if (items.hasOwnProperty(key) && items[key].length > 0) {
          items[key].forEach(function (element) {
            names[key].push(element.name);
          }, this);
        }
      }
      return names;
    },

    getItems: function (typeIn) {
      //0、根据this.options
      //'all'、全部；
      //'merge'、合并到节点；
      //'leaf'、仅叶子；
      //'node'、仅节点；
      var type
      var leaf = [];
      var node = [];
      var data = this.arrayData;

      if (!typeIn) {
        if (this.opt.getType) {
          type = this.opt.getType;
        } else if (this.opt.only_child) {
          type = 'leaf';
        } else if (this.opt.node_merge) {
          type = 'merge';
        } else {
          type = 'all';
        }
      } else {
        type = typeIn;
      }

      switch (type) {
        case 'node': //仅节点
          $.each(data, function (i, n) {
            if (n.is_check === true && n.is_node === true) {
              node.push(n);
            }
          });
          break;

        case 'leaf': //仅叶子
          $.each(data, function (i, n) {
            if (n.is_check === true && n.is_node === false) {
              leaf.push(n);
            }
          });
          break;

        case 'merge': //合并到节点
          var nodeIds = [];
          $.each(data, function (i, n) {
            if (n.is_check === true && n.is_node === true) {
              nodeIds.push(n.id);
            }
          });
          //节点合并
          var clone = $.extend(false, [], data); //直接赋值传的是引用
          $.each(clone, function (i, n) {
            if (($.inArray(n.nodeId, nodeIds) != -1) || !n.is_check) {
              clone[i] = null;
            }
          });
          $.each(clone, function (i, n) {
            if (n && n.is_node === true) {
              node.push(n);
            } else if (n && n.is_node === false) {
              leaf.push(n);
            }
          });
          break;
        case 'all':
        default: //全部
          $.each(data, function (i, n) {
            if (n.is_check === true && n.is_node === true) {
              node.push(n);
            } else if (n.is_check === true && n.is_node === false) {
              leaf.push(n);
            }
          });
          break;
      }
      return {
        node: node,
        leaf: leaf
      };
    },

    cancelItem: function (ids, type) {
      if (!Array.isArray(ids)) {
        return "checkItem(),参数ids不是数组";
      }
      var items = this._getItemsByIds(this.arrayData, ids, type);
      for (var i = 0; i < items.length; i++) {
        this._changeItem(items[i], false);
      }
    },
    checkItem: function (ids, type) {
      if (!Array.isArray(ids)) {
        return "checkItem(),参数ids不是数组";
      }
      var items = this._getItemsByIds(this.arrayData, ids, type);
      for (var i = 0; i < items.length; i++) {
        this._changeItem(items[i], true);
      }
    },
    cancelAll: function () {
      for (var i = 0; i < this.arrayData.length; i++) {
        this._changeItem(this.arrayData[i], false);
      }
    },
    checkAll: function () {
      for (var i = 0; i < this.arrayData.length; i++) {
        this._changeItem(this.arrayData[i], true);
      }
    },

    makeTag: function (item) {
      var $html = $('<span data-id="' + item.id + '" >' + item.name + '<span>');
      $html.css({
        padding: '5px',
        border: '1px solid #666',
      });
      $icon = $('<i class="fa fa-times" aria-hidden="true"></i>');
      var that = this;
      $icon.on('click', function name(e) {
        e.stopPropagation();
        that._changeItem(item, false);
        $html.remove();
      });
      $html.prepend($icon);
      return $html;
    },

    search: function (val) {
      this.tree.$body.$result.empty();
      if (val === '') {
        this.tree.$body.$children.show();
      } else {
        this.tree.$body.$children.hide();
        for (var i in this.arrayData) {
          if (this.opt.searchType == 'all') {
            if (this.arrayData[i].name.indexOf(val) != -1) {
              this.tree.$body.$result.append(this._makeSelf(this.arrayData[i]));
            }
          } else if (this.opt.searchType == 'node') {
            if (this.arrayData[i].is_node && this.arrayData[i].name.indexOf(val) != -1) {
              this.tree.$body.$result.append(this._makeSelf(this.arrayData[i]));
            }
          } else if (this.opt.searchType == 'leaf') {
            if (!this.arrayData[i].is_node && this.arrayData[i].name.indexOf(val) != -1) {
              this.tree.$body.$result.append(this._makeSelf(this.arrayData[i]));
            }
          }
        }
      }
    },
    searchAjax: function (val) {
      this.tree.$body.$result.empty();
      if (val === '') {
        this.tree.$body.$children.show();
      } else {
        this.tree.$body.$children.hide();
        var that = this;
        // $.ajax({
        //   type: "POST",
        //   url: that.opt.lazyLoadUrl,
        //   data: {t_key: val, t_type: that.opt.searchType,},
        //   success: function (response) {
        var data = [{
          id: 1,
          name: '中国',
          nodeId: 0,
          is_node: true,
          is_check: false
        }, {
          id: 5399,
          name: '异步加载' + 1,
          nodeId: 1000,
          is_node: false,
          is_check: true,
        }, {
          id: 4399,
          name: '异步加载' + 2,
          nodeId: 1000,
          is_node: true,
          is_check: true,
        }];
        // if(!response.ok){
        //   return false;
        // }
        // var data = response.list;

        // 默认选中
        if (that.opt.sel_ids) {
          that._checkTreeByIds(data, that.opt.sel_ids);
        }

        // 已有的 arrayData
        var arrayData = that.arrayData;
        var len = arrayData.length;

        for (var j = 0; j < data.length; j++) {
          data[j].dataState = 'new';
          for (var i = 0; i < len; i++) {
            if (arrayData[i].id === data[j].id && arrayData[i].is_node === data[j].is_node) {
              data[j] = arrayData[i];
              data[j].dataState = 'array';
              break;
            }
          }
          if (data[j].dataState === 'new') {
            data[j] = that.newItem(data[j], that.tree, []);
            arrayData.push(data[j]);
          }
        }

        // 生成 DOM 结构 ，DOMed
        for (var i = 0; i < data.length; i++) {
          that.tree.$body.$result.append(that._makeSearchItem(data[i]));
          if (data[i].is_check && that.opt.is_multi) {
            that._changeItem(data[i], true);
          }
        }
        //   }
        // });

      }
    },

    /**
     *      数据方法
     */

    _validateOpt: function (opt) {
      for (var i in opt.data) {
        if (typeof opt.data[i] !== 'object') {
          return false;
        }
      }
      return true;
    },

    _mergeSearchData: function name(array1, array2) {
      for (var i = 0; i < array.length; i++) {
        var element = array[i];
        for (var j = 0; j < array.length; j++) {
          var element = array[j];

        }
      }
    },

    _arrayToTree: function (arrayIn) {
      var rootIds = this._getTreeRoot(arrayIn);
      var treeData = {
        id: rootIds,
        name: 'ROOT',
        nodeId: null,
        is_node: true,
        is_check: false,
        checkState: false,
        children: [],
        parent: null,
        level: 0,
        expand: true,
        amount: arrayIn.length
      };
      for (var i = 0; i < rootIds.length; i++) {
        for (var j = 0; j < arrayIn.length; j++) {
          if (arrayIn[j].nodeId == rootIds[i]) {
            treeData.children.push(this.newItem(arrayIn[j], treeData, arrayIn));
          }
        }
      }
      return treeData;
    },
    _getTreeRoot: function (arrayIn) {
      var rootIds = [];
      var clone = JSON.parse(JSON.stringify(arrayIn));
      for (var i = 0, len = arrayIn.length; i < len; i++) {
        for (var j = i; j < len; j++) {
          if (arrayIn[i].id == arrayIn[j].nodeId) {
            clone[j] = null;
          }
          if (arrayIn[i].nodeId == arrayIn[j].id) {
            clone[i] = null;
          }
        }
      }
      for (var k = 0; k < clone.length; k++) {
        if (clone[k]) {
          rootIds.push(clone[k].nodeId);
        }
      }
      rootIds = this._uniqueArray(rootIds);

      if (rootIds.length > 1) {
        console.warn('warning: rootId不唯一', rootIds);
      } else if (rootIds.length <= 0) {
        console.warn('warning: 没有rootId', rootIds);
      }

      return rootIds;
    },
    _uniqueArray: function (arrayIn) {
      var ua = [];
      for (var i = 0; i < arrayIn.length; i++) {
        if ($.inArray(arrayIn[i], ua) == -1) {
          ua.push(arrayIn[i]);
        }
      }
      return ua;
    },
    _getSubTree: function (parent, arrayIn) {
      var result = [];
      for (var i = 0; i < arrayIn.length; i++) {
        if (arrayIn[i].nodeId == parent.id) {
          result.push(this.newItem(arrayIn[i], parent, arrayIn));
        }
      }
      return result;
    },
    newItem: function name(originItem, parent, arrayIn) {
      var result = originItem;
      result.checkState = result.is_check;
      result.parent = parent;
      result.level = parent.level + 1;
      result.expand = this.expandLvl(this.opt.expand, result);
      result.loaded = false;
      if (result.is_node && !this.opt.lazyLoad) {
        result.children = this._getSubTree(result, arrayIn);
      } else {
        result.children = [];
      }
      return result;
    },
    expandLvl: function name(expand, item) {
      if (this.opt.lazyLoad || !item.is_node) {
        return false;
      }
      if (expand === true) {
        return true;
      } else if (expand === false) {
        return item.level <= 0;
      } else if (item.level <= expand) {
        return true;
      }
      return false;
    },
    _getItemById: function (data, id) {
      for (var i = 0; i < data.length; i++) {
        if (data[i].id == id) {
          return data[i];
        }
      }
      return false;
    },
    _getItemsByIds: function (data, ids, type) {
      var items = [];
      if (!type || type === 0) {
        for (var i = 0; i < ids.length; i++) {
          for (var j = 0; j < data.length; j++) {
            if (data[j].id == ids[i]) {
              items.push(data[j]);
            }
          }
        }
      } else if (type === 1) {
        for (var m = 0; m < ids.length; m++) {
          for (var n = 0; n < data.length; n++) {
            if (data[n].id == ids[m] && !data[n].is_node) {
              items.push(data[n]);
            }
          }
        }
      }
      return items;
    },

    _checkDataRadio: function (data, sel_ids) {
      if (!Array.isArray(sel_ids)) {
        var sel_id = sel_ids.split(',');
      }
      for (var j = 0; j < data.length; j++) {
        if (data[j].id == sel_id[0]) {
          this._changeItem(data[j], true);
          return false;
        }
      }
      return false;
    },
    _checkItemById: function (data, id) {
      for (var i = 0; i < data.length; i++) {
        if (data[i].id == id) {
          this._changeItem(data[i], true);
          return false;
        }
      }
      return false;
    },
    _checkTreeByIds: function (tree, sel_ids) {
      if (!Array.isArray(sel_ids)) {
        var ids = sel_ids.split(',');
      }
      this._traverseTree(tree, this._checkTreeByIdsFn, ids);
    },
    _checkTreeByIdsFn: function (item, ids) {
      if (!ids.length) {
        return {
          children: false,
          brother: false
        };
      }
      if (this.opt.only_child) {
        for (var i = 0; i < ids.length; i++) {
          if (item.id == ids[i] && !item.is_node) {
            this._changeItem(item, true);
            ids.splice(i, 1);
            break;
          }
        }
      } else {
        for (var j = 0; j < ids.length; j++) {
          if (item.id == ids[j]) {
            this._changeItem(item, true);
            ids.splice(j, 1);
            break;
          }
        }
      }
      return {
        children: ids.length,
        brother: ids.length
      };
    },

    _changeItem: function (item, change) {
      if (this.opt.is_multi) {
        this._changeItemMulti(item, change);
      } else {
        this._changeItemRadio(item, change);
      }
    },
    _changeItemRadio: function (item, change) {
      if (!item) {
        return false;
      }
      for (var i = 0; i < this.arrayData.length; i++) {
        this.arrayData[i].is_check = false;
        this.arrayData[i].checkState = false;
        this._updateCheck(this.arrayData[i]);
      }
      if (this.opt.radioCancel === false && change === false) {
        change = true;
      }
      item.is_check = change;
      item.checkState = change;
      this._updateCheck(item);
      this._changeCallback(item, change);
      return false;
    },
    _changeItemMulti: function (item, change) {
      //同选中时，不操作；同取消时，操作。原因：自己选中时，孩子一定是选中的；自己未选中时，孩子状态未知。
      if (!item) {
        return false;
      }
      for (var i = 0; i < this.arrayData.length; i++) {
        var element = this.arrayData[i];
        if (element.is_radio) {
          element.is_check = false;
          element.checkState = false;
          this._updateCheck(element);
        }
      }
      item.is_check = change;
      item.checkState = change;
      this._updateCheck(item);
      if (item.is_node && item.children) {
        this._changeChildren(item.children, change);
        this._changeChildrenState(item.children, change);
      }
      if (item.parent) {
        this._changeParent(item.parent, change);
        this._changeParentState(item.parent, change)
      }
      this._changeCallback(item, change);
    },
    _changeCallback: function name(item, change) {
      if (this.state._initialized) {
        if (change) {
          this.opt.onCheck.call(this, item);
        } else {
          this.opt.onCancel.call(this, item);
        }
        this.opt.onChange.call(this, item);
      }
    },
    _changeChildren: function (children, change) {
      if (!children) {
        return false;
      }
      for (var i = 0; i < children.length; i++) {
        if (children[i].is_check != change) {
          children[i].is_check = change;
          if (children[i].children) {
            this._changeChildren(children[i].children, change);
          }
        }
      }
    },
    _changeParent: function (parent, change) {
      if (!parent || parent.is_check == change) {
        return false;
      }
      if (change) {
        for (var i = 0; i < parent.children.length; i++) {
          if (!parent.children[i].is_check) {
            return false;
          }
        }
      }
      parent.is_check = change;
      if (parent.parent) {
        this._changeParent(parent.parent, change);
      }
    },
    _changeChildrenState: function (children, change) {
      if (!children) {
        return false;
      }
      for (var i = 0; i < children.length; i++) {
        if (children[i].checkState != change) {
          children[i].checkState = change;
          this._updateCheck(children[i]);
          if (children[i].children) {
            this._changeChildrenState(children[i].children, change);
          }
        }
      }
      return true;
    },
    _changeParentState: function (parent, change) {
      if (!parent) {
        return false;
      }
      var old = parent.checkState;
      var len = parent.children.length;

      if (change === "z") {
        parent.checkState = "z";
      } else if (change === true) {
        var n = 0;
        for (var i = 0; i < len; i++) {
          if (parent.children[i].checkState === true) {
            n += 1;
          } else {
            parent.checkState = "z";
            break;
          }
        }
        if (n === len) {
          parent.checkState = true;
        }
      } else if (change === false) {
        var m = 0;
        for (var j = 0; j < len; j++) {
          if (parent.children[j].checkState === false) {
            m += 1;
          } else {
            parent.checkState = "z";
            break;
          }
        }
        if (m === len) {
          parent.checkState = false;
        }
      }

      this._updateCheck(parent);
      if (parent.parent && parent.checkState !== old) {
        this._changeParentState(parent.parent, parent.checkState);
      }
      return true;
    },

    _traverseTree: function (tree, fn, input, output) {
      if (!tree) {
        return true;
      }
      var _continue = fn.call(this, tree, input, output); //是否继续遍历
      if (_continue.children && tree.children) {
        for (var i = 0; i < tree.children.length; i++) {
          var brother = this._traverseTree(tree.children[i], fn, input, output);
          if (!brother) {
            break;
          }
        }
      }
      return _continue.brother;
    },

    /**
     *  视图：构造Tree、header、body、footer
     */

    _makeTree: function (treeData) {
      var tree = treeData;
      tree.$dom = this._makeTreeWrap(tree);
      tree.$header = this._makeTreeHeader(tree);
      tree.$body = this._makeTreeBody(tree);
      tree.$footer = this._makeTreeFooter(tree);
      tree.$dom.append(tree.$header, tree.$body, tree.$footer);
      tree.$dom.hide();
      return tree;
    },

    _makeTreeWrap: function (item) {
      var $html = $('<div class="x-tree-wrap"></div>');
      var style = {
        width: this.opt.width ? this.opt.width : this.dom.outerWidth(),
        minWidth: this.opt.minWidth,
        'font-family': 'Microsoft YaHei',
        'font-size': '14px',
        'color': '#7d7d7d',
        'background': '#fff',
        'user-select': 'none',
        '-ms-user-select': 'none',
        '-moz-user-select': 'none',
        '-webkit-user-select': 'none',
      };
      if (this.opt.is_trigger || this.opt.position === 'fixed') {
        style['position'] = 'absolute';
        style['border'] = '1px solid #d7d9db';
        style['border-radius'] = '2px';
        style['z-index'] = this.opt.zIndex;
      }
      $html.css(style);
      return $html;
    },
    _makeTreeHeader: function (tree) {
      var $header = $('<div class="x-tree-header"></div>');
      $header.css({
        padding: '10px 10px 3px',
      });
      $header.$input = this._makeSearchInput();
      var $wrap = $('<div></div>');
      var $searchIcon = $('<i class="iconfont icon-sousuo"></i>');
      $wrap.css({
        position: 'relative'
      });
      $searchIcon.css({
        display: 'inline-block',
        position: 'absolute',
        top: '10px',
        right: '5px',
        cursor: 'pointer',
      });
      var that = this;
      $searchIcon.on('click', function name(e) {
        that.searchAjax($header.$input.val());
      });
      $wrap.append($header.$input, $searchIcon)
      $header.append($wrap);
      if (!this.opt.has_search) {
        $header.hide();
      }
      return $header;
    },
    _makeTreeBody: function (tree) {
      var $body = $('<div class="x-tree-body"></div>');
      var style = {
        maxHeight: this.opt.maxHeight,
        'white-space': 'nowrap',
        'overflow': 'auto',
      };
      $body.css(style);

      $body.$result = this._makeSearchResult();
      $body.$self = this._makeSelf(tree);
      $body.$self.hide();
      $body.$children = this._makeChildren(tree);
      $body.$children.css({
        'margin-left': '10px',
      });
      $body.append($body.$result, $body.$self, $body.$children);
      return $body;
    },
    _makeTreeFooter: function (tree) {
      var $footer = {};
      $footer = $('<div class="x-tree-footer"></div>');

      $footer.$cancelAll = $('<span class="x-tree-cancel">清空</span>');
      $footer.$confirm = $('<span class="x-tree-confirm">确定</span>');

      $footer.css({
        'border-top': '1px solid #d7d9db',
        padding: '10px',
        'text-align': 'center',
      });
      $footer.$cancelAll.css({
        'margin-right': '20px',
        padding: '2px 6px',
        'line-height': '24px',
        cursor: 'pointer',
        color: '#f2f2f2',
        'background-color': '#acaeaf',
        'border-radius': '2px',
      });
      $footer.$confirm.css({
        padding: '2px 6px',
        'line-height': '24px',
        cursor: 'pointer',
        color: '#f2f2f2',
        'background-color': '#66a5e0',
        'border-radius': '2px',
      });

      var that = this;
      $footer.$cancelAll.on('click', function name(params) {
        that.cancelAll();
      });

      $footer.$confirm.on('click', function name(params) {
        that.opt.onConfirm.call(that);
      });

      $footer.append($footer.$cancelAll, $footer.$confirm);
      if (!this.opt.has_buttons) {
        $footer.hide();
      }
      return $footer;
    },

    _makeSearchInput: function (item) {
      var $input = $('<input class="x-tree-search-input" type="text" placeholder="请输入关键词" >');
      $input.css({
        'display': 'block',
        'width': '100%',
        'line-height': '30px',
        'border': '1px solid #d7d9db',
      });
      var that = this;
      $input.on('keyup paste', function () {
        var input = this;
        clearTimeout(that.state._searchTimer);
        if (that.opt.lazyLoad) {
          that.state._searchTimer = setTimeout(function () {
            if (input.value === '') {
              that.searchAjax(input.value);
            }
          }, 100);
        } else {
          that.state._searchTimer = setTimeout(function () {
            that.search(input.value);
          }, 100);
        }
      });
      return $input;
    },
    _makeSearchResult: function () {
      var $searchResult = $('<div></div>');
      $searchResult.addClass('x-tree-search-result');
      $searchResult.css({
        'margin-left': '10px',
      });

      return $searchResult;
    },

    _makeSearchItem: function (item) {
      if (!item) {
        return false;
      }
      item.$self2 = this._makeSelfWrap(item);
      item.$expand2 = this._makeExpand({
        is_node: false
      });
      item.$check2 = this._makeCheck(item);
      item.$icon2 = this._makeIcon(item);
      item.$text2 = this._makeText(item);
      item.$self2.append(item.$expand2, item.$check2, item.$icon2, item.$text2);
      return item.$self2;
    },

    _makeItem: function (item) {
      if (!item) {
        return false;
      }
      item.$item = this._makeItemWrap(item);
      item.$self = this._makeSelf(item);
      item.$children = this._makeChildren(item);
      item.$item.append(item.$self, item.$children);
      return item.$item;
    },
    _makeItemWrap: function (item) {
      var $itemWrap = $('<div class="x-tree-item" ></div>');
      $itemWrap.attr({
        'node-id': item.nodeId,
        'data-id': item.id
      });
      if (item.is_node) {
        $itemWrap.addClass('x-tree-node-' + item.id);
      } else {
        $itemWrap.addClass('x-tree-leaf-' + item.id);
      }
      $itemWrap.css({
        cursor: 'pointer'
      });
      return $itemWrap;
    },
    _makeSelf: function (item) {
      item.$self = this._makeSelfWrap(item);
      item.$expand = this._makeExpand(item);
      item.$check = this._makeCheck(item);
      item.$icon = this._makeIcon(item);
      item.$text = this._makeText(item);
      item.$self.append(item.$expand, item.$check, item.$icon, item.$text);
      return item.$self;
    },
    _makeSelfWrap: function (item) {
      var $selfWrap = $('<div></div>');
      $selfWrap.addClass('x-tree-self');
      $selfWrap.css({
        'line-height': '36px',
      });
      return $selfWrap;
    },
    _makeChildren: function (item) {
      var $children = this._makeChildrenWrap(item);
      if (item.is_node && item.children && item.children.length) {
        for (var i = 0; i < item.children.length; i++) {
          $children.append(this._makeItem(item.children[i]));
        }
      }
      return $children;
    },
    _makeChildrenWrap: function (item) {
      var $html = $('<div class="x-tree-children"></div>');
      $html.css({
        'margin-left': '20px'
      });
      if (item.expand === false) {
        $html.hide();
      }
      return $html;
    },

    _makeExpand: function (item) {
      var $expand;
      if (!item.is_node || (!this.opt.lazyLoad && !item.children.length)) {
        $expand = $('<span></span>');
      } else {
        if (item.expand === false) {
          $expand = $('<i class="x-tree-expand iconfont icon-2-add-small"></i>');
        } else {
          $expand = $('<i class="x-tree-expand iconfont icon-2-minus"></i>');
        }
        var that = this;
        $expand.on('click', function (e) {
          if ($(this).hasClass('icon-2-add-small')) {
            if (that.opt.lazyLoad && !item.loaded) {
              // $.ajax({
              //   type: "POST",
              //   url: that.opt.lazyLoadUrl,
              //   data: {id: item.id},
              //   success: function (response) {
              var data = [{
                id: item.id + 5399,
                name: '异步加载' + item.id + 1,
                nodeId: item.id,
                is_node: false,
                is_check: true,
              }, {
                id: item.id + 5399,
                name: '异步加载' + item.id + 2,
                nodeId: item.id,
                is_node: true,
                is_check: true,
              }];
              // if(!response.ok){
              //   return false;
              // }
              // var data = response.list;
              if (!data || !data.length) {
                var $blank = $('<span></span>');
                $blank.css({
                  display: 'inline-block',
                  'vertical-align': 'base-line',
                  padding: '0 4px 0 0',
                  'cursor': 'pointer',
                  width: '16px',
                });
                item.$expand.after($blank);
                item.$expand.hide();
                return false;
              }

              // 默认选中
              if (that.opt.sel_ids) {
                that._checkTreeByIds(data, that.opt.sel_ids);
              }
              // 已有的 arrayData
              var arrayData = that.arrayData;
              var len = arrayData.length;
              for (var j = 0; j < data.length; j++) {
                data[j].dataState = 'new';
                for (var i = 0; i < len; i++) {
                  if (arrayData[i].id === data[j].id && arrayData[i].is_node === data[j].is_node) {
                    data[j] = arrayData[i];
                    data[j].dataState = 'array';
                    break;
                  }
                }
                if (data[j].dataState === 'new') {
                  data[j] = that.newItem(data[j], item, []);
                  arrayData.push(data[j]);
                }
              }

              // 对象格式, 视图
              for (var i = 0; i < data.length; i++) {
                item.children.push(data[i]);
                item.$children.append(that._makeItem(data[i]));
                if (data[i].is_check && that.opt.is_multi) {
                  that._changeItem(data[i], true);
                }
              }
              // 完成
              item.loaded = true;
              that._showChildren(item);
              //   }
              // });
            } else {
              that._showChildren(item);
            }
          } else {
            that._hideChildren(item);
          }
        });
      }
      $expand.css({
        display: 'inline-block',
        'vertical-align': 'base-line',
        padding: '0 4px 0 0',
        'cursor': 'pointer',
        width: '16px',
      });
      return $expand;
    },
    _makeCheck: function (item) {
      if (!item) {
        return false;
      }
      var $check;
      var style = {
        display: 'inline-block',
        // 'vertical-align': 'bottom',
        padding: '0 5px 0 5px',
        'cursor': 'pointer',
        'font-size': '18px',
        // width: '16px',
        // height: '16px',
      }
      if (item.is_check) {
        $check = $('<i class="x-tree-check iconfont icon-2-square-check1" /i>');
        style.color = '#5AA4E1'
      } else {
        $check = $('<i class="x-tree-check iconfont icon-2-square-uncheck" /i>');
        style.color = '#cccccc'
      }
      $check.css(style);

      // 单选只、选叶子，则不显示 Checkbox
      if (!this.opt.is_multi && this.opt.only_child && item.is_node) {
        $check.hide();
      }

      var that = this;
      $check.on('click', function () {
        if (item.is_radio) {
          that._changeItemRadio(item, !item.is_check);
        } else {
          that._changeItem(item, !item.is_check);
        }
      });
      return $check;
    },
    _makeIcon: function (item) {
      if (!item || !item.is_node) {
        return '';
      }
      var $icon = $('<i class="iconfont icon-2-filefolder"></i>');
      $icon.css({
        display: 'inline-block',
        'vertical-align': 'base-line',
        'font-size': '12px',
        padding: '0 3px 0 0',
        color: '#d8d9db',
        'cursor': 'pointer',
      });
      return $icon;
    },
    _makeText: function (item) {
      if (!item) {
        return '';
      }
      var $text = $('<span class="x-tree-item-text"></span>');
      $text.text(item.name);
      var that = this;
      $text.on('click', function () {
        // that._changeItem(item, !item.is_check);
        if (item.is_node && item.children && item.children.length) {
          if (item.$expand.hasClass('icon-2-add-small')) {
            that._showChildren(item);
          } else {
            that._hideChildren(item);
          }
        }
      });
      return $text;
    },

    /**
     *    视图：显示、隐藏
     */

    _showTree: function () {
      this.tree.$dom.show();
      if (this.opt.is_trigger) {
        this.tree.$dom.css({
          top: this.dom.outerHeight(),
          left: 0,
        });
        this.tree.$dom.find('.x-tree-search').focus();
      }
      if (this.opt.position === 'fixed') {
        this.tree.$dom.css({
          top: this.dom.offset().top + this.dom.outerHeight(),
          left: this.dom.offset().left,
        });
      }
    },
    _hideTree: function () {
      this.tree.$dom.hide();
    },

    _showChildren: function (item) {
      item.expand = true;
      item.$children.show();
      this._updateExpand(item);
    },
    _hideChildren: function (item) {
      item.expand = false;
      item.$children.hide();
      this._updateExpand(item);
    },

    _updateExpand: function (item) {
      if (item.expand) {
        item.$expand.removeClass('icon-2-add-small');
        item.$expand.addClass('icon-2-minus');
      } else {
        item.$expand.removeClass('icon-2-minus');
        item.$expand.addClass('icon-2-add-small');
      }
    },
    _updateCheck: function (item) {
      if (!item.$check && !item.$check2) {
        return false;
      }
      if (item.checkState === true) {
        if (item.$check) {
          item.$check.removeClass('icon-2-square-uncheck icon-2-square-part');
          item.$check.addClass('icon-2-square-check1');
          item.$check.css({
            color: '#5AA4E1'
          });
        }
        if (item.$check2) {
          item.$check2.removeClass('icon-2-square-uncheck icon-2-square-part');
          item.$check2.addClass('icon-2-square-check1');
          item.$check2.css({
            color: '#5AA4E1'
          });
        }
      } else if (item.checkState === false) {
        if (item.$check) {
          item.$check.removeClass('icon-2-square-check1 icon-2-square-part');
          item.$check.addClass('icon-2-square-uncheck');
          item.$check.css({
            color: '#cccccc'
          });
        }
        if (item.$check2) {
          item.$check2.removeClass('icon-2-square-check1 icon-2-square-part');
          item.$check2.addClass('icon-2-square-uncheck');
          item.$check2.css({
            color: '#cccccc'
          });
        }
      } else if (item.checkState === 'z') {
        if (item.$check) {
          item.$check.removeClass('icon-2-square-uncheck icon-2-square-check1');
          item.$check.addClass('icon-2-square-part');
          item.$check.css({
            color: '#5AA4E1'
          });
        }
        if (item.$check2) {
          item.$check2.removeClass('icon-2-square-uncheck icon-2-square-check1');
          item.$check2.addClass('icon-2-square-part');
          item.$check2.css({
            color: '#5AA4E1'
          });
        }
      }
      return true;
    },
  };

})(jQuery);
