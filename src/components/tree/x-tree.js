/**
 * 命名大意：
 * dom    用户定义承载树的dom
 * html   树的html
 * item   data的每一条,可以是node也可以是child
 * child  树的叶子;子元素;成员
 * node   树的节点;文件夹;部门
 * layer  树的层级,包含同一层的item(node,child);
 * _      带有下划线的是插件需要的方法属性，用户不需要使用
 *
 *
 *
 *
 * 思路:
 * 1.node的id和child的id可以重复,因为实际场景可能是两种数据比如,部门和人员.对于省份和城市可能本身就不会重复
 * 2.选择数据,用户需要的结果是:1.所有child.2.node+child
 * 3.is_trigger如果是true,是为input框设计的,会去读取input框的宽度作为自身的宽度
 * 4.这里html的input显示的时候根据data决定是否check，
 * 5.每次的点击input产生的变化是html变了，然后data也变。
 * 6.4，5导致容易出错,但我觉得应该是根据操作data数据发生变化，变化完毕，统一一个方法决定html结构的变化，不过效率不一定更高
 * 7.only_child为true必然不会node_merge
 * 8.代码中还有一些根据标签(div,span)来做的判断,都不太靠谱
 *
 *
 */

;(function ($) {

    window.xTree = function (opt) {
        return new tree(opt);
    };

    var defOpt = {
        dom: '',  //jqueryDom
        is_trigger: false,  //是否需要触发? 否则直接显示
        has_search: false,
        only_child: true,//是否结果只要 child
        node_merge: true,//结果只显示最上层  比如   中国被选中  四川,成都则不会显示  否则 每个被勾选的节点都显示
        zIndex: 1,
        choose: false,  //哪些是选中的？优先级高于data  {nodeId:[1,2,3],id:[1,2,3]}
        // node_first:false,//是否需要节点排在前面  否则按照data的顺序
        is_multi: true,//是否多选
        expand: false, //是否展开，false、true、num  //todo expand
        width: null,
        maxHeight: 300,
        data: [],//{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
        sel_ids: '',
        onInit: function () {
        },
        onBeforeOpen: function () {
        },
        onOpen: function () {
        },
        onCheck: function () {
        },
        onCancel: function () {
        },
        onChange: function () {
        },
        onClose: function () {
        },
    };


    var tree = function (opt) {
        this._init(opt);
        return this;
        /**
         * return {
         *     'start':this.start,
         *     'end':this.end
         * };  //todo  这样会导致 this 没有 别的方法 到底 还是不能正常使用
         */
    };


    /**
     *
     * @var opt  用户传进来的option
     * @var dom 打开tree的载体jquery dom
     * @var data  做tree的data
     * @var html tree的html
     */


    tree.prototype = {
        _is_open: false,  //是否open
        _originId: {nodeId: [], id: []},   //上次打开时候选中了哪一些id
        _searchTimer: '',   //搜索框的定时器
        _is_first: true,  //是不是第一次打开
        _init: function (opt) {
            var res = checkData(opt.data);
            if (!res) {
                return false;
            }

            this.opt = $.extend(true, {}, defOpt, opt);
            this.data = _initData(this.opt.data);
            this.rootId = _getRootId(this.data);
            if (this.opt.sel_ids) {
                _selData(this.data, this.opt.sel_ids);
            }

            this._originId = this.getId();

            this.dom = this.opt.dom;
            this.dom.css({'position': 'relative'});
            this.html = this._makePanel();

            this.opt.onInit.apply(this);

            var that = this;

            if (this.opt.is_trigger) {
                this.dom.off('click.xTree');
                this.dom.on('click.xTree', function (e) {
                    $('.xTreePanel').hide();
                    that.start();
                    e.stopPropagation();
                });
                $(document).on('click.xTree', function () {
                    that.end();
                });
            } else {
                this.start();
            }
        },

        /**
         *      方法
         *
         */
        start: function () {
            this.opt.onBeforeOpen.apply(this);

            this._showPanel();
            this._showData();
            this._expand();
            this._is_open = true;

            this.html.find('.x-tree-search').focus();

            this.opt.onOpen.apply(this);
            return this;
        },
        end: function () {
            if (this._is_open) {
                this.html.hide();

                this.opt.onClose.apply(this);

                this._originId = this.getId();

                this._is_open = false;
            }
        },

        getName: function () {
            var text = [];
            var data = this.data;
            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        text.push(n.name);
                    }
                });
            } else {
                if (this.opt.node_merge) {
                    var nodes = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            nodes.push(n.id);
                        }
                    });

                    var clone = $.extend(true, [], data); //直接赋值传的是引用
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, nodes) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });

                    $.each(clone, function (i, n) {
                        if (n) {
                            text.push(n.name);
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            text.push(n.name);
                        }
                    });
                }
            }

            return text.join();
        },
        getId: function () {
            var id = [];
            var nodeId = [];
            var data = this.data;

            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        id.push(n.id);
                    }
                });

            } else {

                if (this.opt.node_merge) {
                    var node = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            node.push(n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });

                    var clone = $.extend(true, [], data);
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, node) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });


                    $.each(clone, function (i, n) {
                        if (n) {
                            if (n.is_node) {
                                nodeId.push(n.id);
                            } else {
                                id.push(n.id);
                            }
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            if (n.is_node) {
                                nodeId.push(n.id);
                            } else {
                                id.push(n.id);
                            }
                        }
                    });
                }


                id = {'id': id, 'nodeId': nodeId};
            }
            return id;
        },
        cancelItem: function (id, type) {
            var item = {};
            var dom = this.html.find('input[data-isNode="' + parseInt(type) + '"][data-id="' + id + '"]').prop('checked', false);
            $.each(this.data, function (i, n) {
                if (n.id == id && n.is_node == type) {
                    item = n;
                    item.is_check = false;
                }
            });

            this._chgItem(item, dom);

        },
        cancelAll: function () {
            $.each(this.data, function (index, item) {
                item.is_check = false;
            });
            this.html.find('input').prop("checked", false);
            this.opt.onCancel.apply(this);
        },
        checkItem: function (id, type) {
            var item = {};
            var dom = this.html.find('input[data-isNode="' + parseInt(type) + '"][data-i="' + id + '"]').prop('checked', true);
            $.each(this.data, function (i, n) {
                if (n.id == id && n.is_node == type) {
                    item = n;
                    item.is_check = true;
                }
            });

            this._chgItem(item, dom);

        },
        checkAll: function () {
            if (this.opt.is_multi) {
                $.each(this.data, function (index, item) {
                    item.is_check = true;
                });
                this.html.find('input').prop("checked", true);
                this.opt.onCheck.apply(this);
            }
        },
        getItem: function () {
            var arr = [];
            var data = this.data;
            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        arr.push(n);
                    }
                });
            } else {

                if (this.opt.node_merge) {
                    var node = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            node.push(n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });

                    var clone = $.extend(true, [], data);
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, node) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });


                    $.each(clone, function (i, n) {
                        if (n) {
                            arr.push(n);
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            arr.push(n);
                        }
                    });
                }


            }
            return arr;
        },
        search: function (val) {
            this._removeLayer(this.rootId);

            if (val === '') {
                this.html.find('div[node-id="' + this.rootId + '"]').remove();
                this._showLayer(this.rootId);
            } else {
                for (var i in this.data) {
                    if (!this.data[i].is_node && this.data[i].name.indexOf(val) != -1) {
                        this.html.find('div[node-id="' + this.rootId + '"]').append(this._makeItem(this.data[i]));
                    }
                }
            }
        },


        /**
         *      数据方法
         */
        _getLayerData: function (parent) {
            var res = [];
            for (var i in this.data) {
                if (this.data[i].nodeId == parent) {
//                if(data[i].is_node){
//                    res.unshift(data[i])
//                }else{
//                    res.push(data[i]);
//                }

                    res.push(this.data[i]);  //原序
                }
            }
            return res;
        },

        _chgItem: function (item, dom) {

            if (this.opt.is_multi) {
                if (item.is_node) {
                    dom.parent().parent().find('label > input').prop('checked', item.is_check);
                    this._chgAllChildren(item.id, item.is_check);
                }

                if (!item.is_check) {
                    this._cancelParentNode(item.nodeId);
                } else {
                    this._checkParentNode(item.nodeId);
                }
            } else {
//                    this.html.find('input').prop("checked",false);
//                    $(this).prop('checked',true);
            }


            var childItem = [];
            this._getChild(item, childItem);


            if (!item.is_check) {
                this.opt.onCancel.apply(this);
            } else {
                this.opt.onCheck.apply(this);
            }
            this.opt.onChange.apply(this);

        },
        _getChild: function (node, cont) {
            if (node.is_node && node.has_children) {
                var that = this;
                $.each(that.data, function (i, n) {
                    if (n.nodeId == node.id) {
                        cont.push(n);
                        if (n.is_node && node.has_children) {
                            that._getChild(n, cont);
                        }
                    }
                })
            }
        },
        _cancelParentNode: function (id) {
            var obj = this;
            $.each(obj.data, function (i, n) {
                if (n.id == id && n.is_node && n.is_check) {
                    n.is_check = false;
                    obj.html.find('input[data-isNode="1"][data-id="' + id + '"]').prop('checked', false);
                    obj._cancelParentNode(n.nodeId);
                }
            })
        },
        _checkParentNode: function (id) {
            var obj = this;
            var allChildrenChecked = true;
            $.each(obj.data, function (i, n) {
                if (n.nodeId == id && !n.is_check) {
                    allChildrenChecked = false;
                }
            });
            $.each(obj.data, function (i, n) {
                if (n.id == id && n.is_node && !n.is_check && allChildrenChecked) {
                    n.is_check = true;
                    obj.html.find('input[data-isNode="1"][data-id="' + id + '"]').prop('checked', true);
                    obj._checkParentNode(n.nodeId);
                }
            });
        },
        _chgAllChildren: function (nodeid, bol) {
            var obj = this;
            $.each($.extend(true, [], this.data), function (i, n) {   //这句话 看起来 好像 不用 extend
                if (n.nodeId == nodeid) {
                    obj.data[i].is_check = bol;
                    if (n.is_node && n.has_children) {
                        obj._chgAllChildren(n.id, bol);
                    }
                }
            });
        },


        /**
         * 构造html内部方法
         */
        _makePanel: function () {
            var html = '<div></div>';

            if (this.opt.has_search) {
                html = this._makeSearch(html);
            }

            var css;
            if (this.opt.is_trigger) {
                css = {
                    'font-family': 'Microsoft YaHei',
                    'z-index': this.opt.zIndex,
                    border: '1px solid #5d5d5d',
                    'background': '#fff',
                    position: 'absolute',
                    maxHeight: this.opt.maxHeight,
                    padding: '0 1%',
                    'white-space': 'nowrap',
                    'overflow': 'auto'
                };
            } else {
                css = {
                    'font-family': 'Microsoft YaHei',
                    'background': '#fff',
                    maxHeight: this.opt.maxHeight,
                    padding: '0 1%',
                    'white-space': 'nowrap',
                    'overflow': 'auto'
                };
            }


            return $(html).css(css);
        },
        _makeSearch: function (html) {
            var search = '<input class="x-tree-search" type="text" placeholder="搜索"/></div>';
            search = $(search).css({
                'border': 'none',
                'padding': '4px 0',
                'margin': '5px auto 0 auto',
                'width': '98%',
                'display': 'block'
            });

            var obj = this;
            $(search).on('keyup paste', function () {
                var dom = this;
                clearTimeout(obj._searchTimer);
                obj._searchTimer = setTimeout(function () {
                    obj.search(dom.value);
                }, 100);
            });

            return $(html).append(search);

        },
        _makeNode: function (item) {
            var $html;
            if (this.opt.is_multi) {
                $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<label><input type="checkbox" data-isNode="1" data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/><span>' + item.name + '</span></label></div>');
            }
            else {
                if (this.opt.only_child) {
                    $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<span>' + item.name + '</span></div>');
                }
                else {
                    $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<label><input type="radio" name="' + this.dom.selector + '" data-isNode="1" data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/><span>' + item.name + '</span></label></div>');
                }
            }
            $html.find('span').css({
                'cursor': 'pointer',
                'user-select': 'none',
                '-webkit-user-select': 'none',
                '-moz-user-select': 'none',
                '-ms-user-select': 'none'
            });
            $html.find('input').css({
                'vertical-align': 'middle'
            });
            var obj = this;
            $html.find('i').on('click', function (e) {
                if ($(this).hasClass('icon-jia1')) {
                    obj._showLayer(item.id);
                } else {
                    obj._removeLayer(item.id);
                }
            });
            return $html;
        },
        _makeChild: function (item) {
            var $html;
            if (this.opt.is_multi) {
                $html = $('<div><span></span><label><input type="checkbox" data-id="' + item.id + '" data-isNode="0" data-name="' + item.name + '" ' + (item.is_check ? 'checked' : '') + '/>' + item.name + '</label></div>');
            }
            else {
                $html = $('<div>' + (this.opt.only_child ? '' : '<span></span>') + '<label><input type="radio" name="' + this.dom.selector + '" data-id="' + item.id + '" data-isNode="0" data-name="' + item.name + '" />' + item.name + '</label></div>');
            }
            $html.find('span').css({
                'width': '16px',
                'user-select': 'none',
                '-webkit-user-select': 'none',
                '-moz-user-select': 'none',
                '-ms-user-select': 'none',
                'display': 'inline-block'
            });
            $html.find('input').css({
                'vertical-align': 'middle'
            });
            return $html;
        },
        _makeItem: function (item) {
            var $html;
            if (item.is_node && item.has_children) {
                $html = this._makeNode(item);
            } else {
                $html = this._makeChild(item);
            }

            var obj = this;
            $html.find('input').on('click', function () {
                if (obj.opt.is_multi) {
                    item.is_check = !item.is_check;
                } else {
                    $.each(obj.data, function (index, item) {
                        item.is_check = false;
                    });
                    item.is_check = true;
                }


                obj._chgItem(item, $(this));

            });

            return $html;
        },
        /**
         *      视图方法
         */

        _showPanel: function () {
            if (this.opt.is_trigger) {
                this.html.css({
                    top: this.dom.outerHeight(),
                    left: 0,
                    minWidth: 200
                    // minWidth: this.opt.width ? this.opt.width : this.dom.outerWidth() * 0.98
                });

                this.html.addClass('xTreePanel');

                this.html.on('click', function (e) {
                    e.stopPropagation();
                });
            }
            this.dom.append(this.html);

        },
        _showData: function () {
            if (this._is_first) {
                this._showLayer(this.rootId);
                this._is_first = false;
            } else {
                this.html.show();
            }
        },
        _expand: function () {
            var obj = this;
            if (obj.opt.expand === true) {
                $.each(obj.data, function (index, item) {
                    if (item.is_node && item.has_children) {
                        obj.html.find('i').filter('.icon-jia1').click();
                    }
                });
            } else if (obj.opt.expand) {
                var expandId = [];
                expandId.push(obj.rootId);
                for (var i = 0; i < obj.opt.expand; i++) {
                    expandId = obj._expandLevel(expandId);
                }
            }
        },
        _expandLevel: function (id) {
            var obj = this;
            var expandId = [];
            $.each(id, function (index, item) {
                $.each(obj.data, function (index2, item2) {
                    if (item2.nodeId === item) {
                        expandId.push(item2.id);
                        obj.html.find('div[node-id="' + item2.nodeId + '"] > i').filter('.icon-jia1').click();
                    }
                });
            });
            return expandId;
        },
        _showLayer: function (layerId) {
            var showData = this._getLayerData(layerId);
            var itemDiv = makeLayer();


            //这里 0节点的结构 和 子节点的结构 没有处理好    以后尽量让node-id 和  itemdiv 分开
            if (layerId === this.rootId) {
                itemDiv = $(itemDiv).attr('node-id', this.rootId);
                this.html.append(itemDiv);
                //itemDiv.parent().attr('node-id',0);

            } else {
                toShrink(this.html.find('div[node-id="' + layerId + '"] i'));
                this.html.find('div[node-id="' + layerId + '"]').append(itemDiv);
            }

            for (var i in showData) {
                itemDiv.append(this._makeItem(showData[i]));
            }
        },
        _removeLayer: function (layerId) {
            this.html.find('div[node-id="' + layerId + '"]>div').remove();
            toExpand(this.html.find('div[node-id="' + layerId + '"] i'));
        },


    };


    function makeLayer() {
        var html = '<div></div>';

        return $(html).css({
            'margin-left': '13px'
        });
    }

    function makeExpand() {
        // var html='<span data-icon="expand">＋</span>';
        var html = '<i class="iconfont icon-jia1"></i>';

        return $(html).css({
            'font-size': '12px',
            'vertical-align': 'base-line',
            'padding-right': '0px',
            'cursor': 'pointer'
        })[0].outerHTML;
    }

    function toShrink(dom) {
        dom.removeClass('icon-jia1');
        dom.addClass('icon-jian1');
    }

    function toExpand(dom) {
        dom.removeClass('icon-jian1');
        dom.addClass('icon-jia1');
    }

    function checkData(data) {
        for (var i in data) {
            return typeof data[i] == 'object';
        }
        return false;
    }

    function _initData(data) {
        var clone = $.extend(true, [], data);
        var len = clone.length;

        for (var k = 0; k < len; k++) {
            clone[k].has_children = false;
        }

        for (var i = 0; i < len; i++) {
            for (var j = i; j < len; j++) {
                if (clone[i].is_node && clone[i].id === clone[j].nodeId) {
                    clone[i].has_children = true;
                }
                if (clone[i].nodeId === clone[j].id && clone[j].is_node) {
                    clone[j].has_children = true;
                }
            }
        }

        return clone;
    }

    function _selData(data, selected) {
        var sel_ids = selected.split(',');
        for (var i = 0; i < sel_ids.length; i++) {
            for (var j = 0; j < data.length; j++) {
                if (data[j].id === sel_ids[i]) {
                    data[j].is_check = true;
                    _selParent(data, data[j].nodeId);
                    if (data[j].is_node && data[i].has_children) {
                        _selChildren(data, data[j].id);
                    }
                }
            }
        }
        return data;
    }

    function _selParent(data, nid) {
        if (!nid) {
            return false;
        }
        var selParent = true;
        var sel_p = {};
        for (var i = 0; i < data.length; i++) {
            if (data[i].id == nid) {
                sel_p = data[i];
            }
            if (data[i].nodeId == nid && !data[i].is_check) {
                selParent = false;
                return false;
            }

        }

        if (selParent) {
            sel_p.is_check = true;
            if (sel_p.nodeId) {
                _selParent(data, sel_p.nodeId);
            }
        }
    }

    function _selChildren(data, id) {
        if (!id) {
            return false;
        }
        for (var i = 0; i < data.length; i++) {
            if (data[i].nodeId === id) {
                data[i].is_check = true;
                if (data[i].is_node && data[i].has_children) {
                    _selChildren(data, data[i].id);
                }
            }

        }
    }

    function _getRootId(_data) {
        var rootId = [];
        var clone = $.extend(true, [], _data);
        for (var i = 0, len = _data.length; i < len; i++) {
            for (var j = i; j < len; j++) {
                if (_data[i].id === _data[j].nodeId) {
                    clone[j] = null;
                }
                if (_data[i].nodeId === _data[j].id) {
                    clone[i] = null;
                }
            }
        }
        $.each(clone, function (i, t) {
            if (t) {
                rootId.push(t.nodeId);
            }
        });

        // //去除数组重复值
        // function unique(array){
        //     var n = [];
        //     for(var i = 0; i < array.length; i++){
        //         if (n.indexOf(array[i]) == -1) n.push(array[i]);
        //     }
        //     return n;
        // }
        //
        // function unique(array){
        //     var r = [];
        //     for(var i = 0, l = array.length; i < l; i++) {
        //         for(var j = i + 1; j < l; j++){
        //             if (array[i] === array[j]) {
        //                 j = ++i;
        //             }
        //         }
        //         r.push(array[i]);
        //     }
        //     return r;
        // }
        // rootId = unique(rootId);

        return rootId[0];
    }


})(jQuery);




