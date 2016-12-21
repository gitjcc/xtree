/**
 * 命名大意：
 * dom    用户定义承载树的dom
 * html   树的html
 * item   data的每一条,可以是node也可以是leaf
 * leaf  树的叶子;子元素;成员
 * node   树的节点;文件夹;部门
 * layer  树的层级,包含同一层的item(node,leaf);
 * _      带有下划线的是插件需要的方法属性，用户不需要使用
 *
 *
 *
 *
 * 思路:
 * 1.node的id和leaf的id可以重复,因为实际场景可能是两种数据比如,部门和人员.对于省份和城市可能本身就不会重复
 * 2.选择数据,用户需要的结果是:1.所有leaf.2.node+leaf
 * 3.is_trigger如果是true,是为input框设计的,会去读取input框的宽度作为自身的宽度
 * 4.这里html的input显示的时候根据data决定是否check，
 * 5.每次的点击input产生的变化是html变了，然后data也变。
 * 6.4，5导致容易出错,但我觉得应该是根据操作data数据发生变化，变化完毕，统一一个方法决定html结构的变化，不过效率不一定更高
 * 7.only_leaf为true必然不会node_merge
 * 8.代码中还有一些根据标签(div,span)来做的判断,都不太靠谱
 *
 */

;(function ($) {

    window.xTreeClosure = tree;

    function tree(option) {
        //定义变量
        var _defOpt = {
            dom: '',  //jqueryDom
            is_trigger: true,  //是否需要触发? 否则直接显示
            has_search: true,
            only_child: true,//是否结果只要 child
            node_merge: false,//结果只显示最上层  比如   中国被选中  四川,成都则不会显示  否则 每个被勾选的节点都显示
            zIndex: 1,
            choose: false,  //哪些是选中的？优先级高于data  {nodeId:[1,2,3],id:[1,2,3]}
            //node_first:false,//是否需要节点排在前面  否则按照data的顺序
            is_multi: true,//是否多选
            only_leaf: false,
            expand: false, //是否展开，false、true、num
            width: null,
            maxHeight: null,
            data: [],//{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
            onInit: function () {
            },
            onOpen: function () {
            }, //触发时
            onBeforeOpen: function () {
            },
            onClose: function (has_chg) {
                //has_chg  是否发生变化
            },
            onCheck: function (item, dom, childrenItem) {
                //item 点击的item
                //dom 点击的dom
                //childrenItem  所有影响的子节点
            },
            onCancel: function (item, dom, childrenItem) {
            }
        };
        var _opt = {};
        var _data = {};
        var _dom = {};
        var _html = {};
        var _state = {
            _is_first: true,
            _is_open: false,
            _rootId: 0,
            _originId: {nodeId: [], id: []},
            _searchTimer: ''
        };

        _init(option);

        // 初始化
        function _init(option) {
            _opt = $.extend(true, {}, _defOpt, option);
            _dom = _opt.dom;
            _data = _opt.data;
            _html = _makePanel();


            var res = checkData(_data);
            if (!res) {
                return false;
            }

            _opt.onInit();

            _initNode();

            if (_opt.choose) {
                var choose = _opt.choose;
                $.each(choose.nodeId, function (i, n) {
                    var item = {};
                    $.each(_data, function (i2, n2) {
                        if (n2.id == n && n2.is_node == 1) {
                            item = n2;
                            item.is_check = true;
                        }
                    });
                    _chgAllChildren(item.id, item.is_check);
                });
                $.each(choose.id, function (i, n) {
                    $.each(_data, function (i2, n2) {
                        if (n2.id == n && n2.is_node == false) {
                            n2.is_check = true;
                        }
                    });
                });
            }

            _state._originId = getId();

            if (_opt.is_trigger) {
                _dom.off('click.xTree');
                _dom.on('click.xTree', function (e) {
                    start();
                    e.stopPropagation();
                });

                $(document).on('click.xTree', function () {
                    end();
                });
            } else {
                start();
            }
        }

        /**
         *      方法
         *
         */
        function start() {
            _opt.onBeforeOpen();
            _showPanel();
            _showData();
            _expand();
            _state._is_open = true;

            _html.find('.x-tree-search').focus();
            _opt.onOpen();
        }

        function end() {
            if (_state._is_open) {
                _html.hide();
                _dom.val(getName());
                var ids = getId();

                _state._is_open = false;
                _opt.onClose(JSON.stringify(ids) !== JSON.stringify(_state._originId));
                _state._originId = ids;
            }
        }

        function getName() {
            var text = [];
            if (_opt.only_leaf) {
                $.each(_data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        text.push(n.name);
                    }
                });
            } else {
                if (_opt.node_merge) {
                    var nodes = [];
                    $.each(_data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            nodes.push(n.id);
                        }
                    });

                    var clone = $.extend(true, [], _data); //直接赋值传的是引用
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
                    $.each(_data, function (i, n) {
                        if (n.is_check) {
                            text.push(n.name);
                        }
                    });
                }
            }

            return text.join();
        }

        function getId() {
            var id = [];
            var nodeId = [];
            if (_opt.only_leaf) {
                $.each(_data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        id.push(n.id);
                    }
                });
            } else {
                if (_opt.node_merge) {
                    var node = [];
                    $.each(_data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            node.push(n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });

                    var clone = $.extend(true, [], _data);
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
                    $.each(_data, function (i, n) {
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
        }

        function cancelItem(id, type) {
            var item = {};
            var dom = _html.find('input[data-isNode="' + parseInt(type) + '"][data-id="' + id + '"]').prop('checked', false);
            $.each(_data, function (i, n) {
                if (n.id == id && n.is_node == type) {
                    item = n;
                    item.is_check = false;
                }
            });

            _chgItem(item, dom);

        }

        function cancelAll() {
            $.each(_data, function (index, item) {
                item.is_check = false;
            });
            _html.find('input').prop("checked", false);
            _opt.onCancel();
        }

        function checkItem(id, type) {
            var item = {};
            var dom = _html.find('input[data-isNode="' + parseInt(type) + '"][data-i="' + id + '"]').prop('checked', true);
            $.each(_data, function (i, n) {
                if (n.id == id && n.is_node == type) {
                    item = n;
                    item.is_check = true;
                }
            });

            _chgItem(item, dom);

        }

        function checkAll() {
            if (_opt.is_multi) {
                $.each(_data, function (index, item) {
                    item.is_check = true;
                });
                _html.find('input').prop("checked", true);
                _opt.onCheck();
            }
        }

        function getItem() {
            var arr = [];
            var data = _data;
            if (_opt.only_leaf) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        arr.push(n);
                    }
                });
            } else {
                if (_opt.node_merge) {
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
        }

        function search(val) {
            _removeLayer(_state._rootId);

            if (val === '') {
                _html.find('div[node-id="' + _state._rootId + '"]').remove();
                _showLayer(_state._rootId);
            } else {
                for (var i in _data) {
                    if (!_data[i].is_node && _data[i].name.indexOf(val) != -1) {
                        _html.find('div[node-id="' + _state._rootId + '"]').append(_makeItem(_data[i]));
                    }
                }
            }
        }

        /**
         *      视图方法
         */
        function _showPanel() {
            if (_opt.is_trigger) {
                _html.css({
                    top: _dom.position().top + _dom.outerHeight(),
                    left: _dom.position().left,
                    minWidth: _opt.width ? _opt.width : _dom.outerWidth()
                });

                _html.on('click', function (e) {
                    e.stopPropagation();
                });

                _dom.after(_html);

            } else {
                _dom.append(_html);
            }
        }

        function _showData() {
            if (_state._is_first) {
                _showLayer(_state._rootId);
                _state._is_first = false;
            } else {
                _html.show();
            }

        }

        function _expand() {
            if (_opt.expand === true) {
                $.each(_data, function (index, item) {
                    if (item.is_node) {
                        _html.find('i').filter('.icon-expand').click();
                    }
                });
            } else if (_opt.expand) {
                var expandId = [];
                expandId.push(_state._rootId);
                for (var i = 0; i < _opt.expand; i++) {
                    expandId = _expandLevel(expandId);
                }
            }
        }

        function _expandLevel(id) {
            var expandId = [];
            $.each(id, function (index, item) {
                $.each(_data, function (index2, item2) {
                    if (item2.nodeId === item) {
                        expandId.push(item2.id);
                        _html.find('div[node-id="' + item2.nodeId + '"] > i').filter('.icon-expand').click();
                    }
                });
            });
            return expandId;
        }

        function _showLayer(layerId) {
            var showData = _getLayerData(layerId);
            var itemDiv = makeLayer();

            //这里 0节点的结构 和 子节点的结构 没有处理好    以后尽量让node-id 和  itemdiv 分开
            if (layerId === _state._rootId) {
                itemDiv = $(itemDiv).attr('node-id', _state._rootId);
                _html.append(itemDiv);
                //itemDiv.parent().attr('node-id',0);

            } else {
                toShrink(_html.find('div[node-id="' + layerId + '"] i'));
                _html.find('div[node-id="' + layerId + '"]').append(itemDiv);
            }

            for (var i in showData) {
                itemDiv.append(_makeItem(showData[i]));
            }
        }

        function _removeLayer(layerId) {
            _html.find('div[node-id="' + layerId + '"]>div').remove();
            toExpand(_html.find('div[node-id="' + layerId + '"] i'));
        }

        /**
         *      数据方法
         */
        function _getLayerData(parent) {
            var res = [];
            for (var i in _data) {
                if (_data[i].nodeId == parent) {
//                if(data[i].is_node){
//                    res.unshift(data[i])
//                }else{
//                    res.push(data[i]);
//                }

                    res.push(_data[i]);  //原序
                }
            }
            return res;
        }

        function _chgItem(item, dom) {

            if (_opt.is_multi) {
                if (item.is_node) {
                    dom.parent().parent().find('label > input').prop('checked', item.is_check);
                    _chgAllChildren(item.id, item.is_check);
                }

                if (!item.is_check) {
                    _cancelParentNode(item.nodeId);
                } else {
                    _checkParentNode(item.nodeId);
                }
            } else {
//                    _html.find('input').prop("checked",false);
//                    $(this).prop('checked',true);
            }


            var childItem = [];
            _getChild(item, childItem);


            if (!item.is_check) {
                _opt.onCancel(item, dom, childItem);

            } else {
                _opt.onCheck(item, dom, childItem);
            }


        }

        function _getChild(node, cont) {
            if (node.is_node) {
                $.each(_data, function (i, n) {
                    if (n.nodeId == node.id) {
                        cont.push(n);
                        if (n.is_node) {
                            _getChild(n, cont);
                        }
                    }
                })
            }

        }

        function _cancelParentNode(id) {
            $.each(_data, function (i, n) {
                if (n.id == id && n.is_node && n.is_check) {
                    n.is_check = false;
                    _html.find('input[data-isNode="1"][data-id="' + id + '"]').prop('checked', false);
                    _cancelParentNode(n.nodeId);
                }
            })
        }

        function _checkParentNode(id) {
            var allChildrenChecked = true;
            $.each(_data, function (i, n) {
                if (n.nodeId == id && !n.is_check) {
                    allChildrenChecked = false;
                }
            });
            $.each(_data, function (i, n) {
                if (n.id == id && n.is_node && !n.is_check && allChildrenChecked) {
                    n.is_check = true;
                    _html.find('input[data-isNode="1"][data-id="' + id + '"]').prop('checked', true);
                    _checkParentNode(n.nodeId);
                }
            });
        }

        function _chgAllChildren(nodeid, bol) {
            $.each($.extend(true, [], _data), function (i, n) {   //这句话 看起来 好像 不用 extend
                if (n.nodeId == nodeid) {
                    _data[i].is_check = bol;
                    if (n.is_node) {
                        _chgAllChildren(n.id, bol);
                    }
                }
            });
        }

        /**
         * 构造html内部方法
         */
        function _makePanel() {
            var html = '<div></div>';

            if (_opt.has_search) {
                html = _makeSearch(html);
            }

            var css;
            if (_opt.is_trigger) {
                css = {
                    'font-family': 'Microsoft YaHei',
                    'z-index': _opt.zIndex,
                    border: '1px solid #5d5d5d',
                    'background': '#fff',
                    position: 'absolute',
                    maxHeight: _opt.maxHeight,
                    'white-space': 'nowrap',
                    'overflow': 'auto'
                };
            } else {
                css = {
                    'font-family': 'Microsoft YaHei',
                    'background': '#fff',
                    maxHeight: _opt.maxHeight,
                    'white-space': 'nowrap',
                    'overflow': 'auto'
                };
            }
            return $(html).css(css);
        }

        function _makeSearch(html) {
            var searchHtml = '<input class="x-tree-search" type="text" placeholder="搜索"/></div>';
            var searchDom = $(searchHtml).css({
                'border': 'none',
                'padding': '4px 0',
                'margin': '5px auto 0 auto',
                'display': 'block'
            });

            $(searchDom).on('keyup paste', function () {
                var that = this;
                clearTimeout(_state._searchTimer);
                _state._searchTimer = setTimeout(function () {
                    search(that.value);
                }, 100);
            });

            return $(html).append(searchDom);

        }

        function _makeNode(item) {
            var $html;
            if (_opt.is_multi) {
                $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<label><input type="checkbox" data-isNode="1" data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/><span>' + item.name + '</span></label></div>');
            }
            else {
                if (_opt.only_leaf) {
                    $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<span>' + item.name + '</span></div>');
                }
                else {
                    $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<label><input type="radio" name="' + _dom.selector + '" data-isNode="1" data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/><span>' + item.name + '</span></label></div>');
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

            $html.find('i').on('click', function (e) {
                if ($(this).hasClass('icon-expand')) {
                    _showLayer(item.id);
                } else {
                    _removeLayer(item.id);
                }
            });

            return $html;
        }

        function _makeLeaf(item) {
            var $html;
            if (_opt.is_multi) {
                $html = $('<div><span></span><label><input type="checkbox" data-id="' + item.id + '" data-isNode="0" data-name="' + item.name + '" ' + (item.is_check ? 'checked' : '') + '/>' + item.name + '</label></div>');
            }
            else {
                $html = $('<div>' + (_opt.only_leaf ? '' : '<span></span>') + '<label><input type="radio" name="' + _dom.selector + '" data-id="' + item.id + '" data-isNode="0" data-name="' + item.name + '" />' + item.name + '</label></div>');
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
        }

        function _makeItem(item) {
            var $html;
            if (item.is_node) {
                $html = _makeNode(item);
            } else {
                $html = _makeLeaf(item);
            }

            $html.find('input').on('click', function () {
                if (_opt.is_multi) {
                    item.is_check = !item.is_check;
                } else {
                    $.each(_data, function (index, item) {
                        item.is_check = false;
                    });
                    item.is_check = true;
                }


                _chgItem(item, $(this));

            });

            return $html;
        }

        function makeLayer() {
            var html = '<div></div>';

            return $(html).css({
                'margin-left': '13px'
            });
        }

        function makeExpand() {
            // var html='<span data-icon="expand">＋</span>';
            var html = '<i class="iconfont icon-expand"></i>';

            return $(html).css({
                'font-size': '14px',
                'font-weight': 'bold',
                'vertical-align': 'base-line',
                'padding-right': '0px',
                'cursor': 'pointer'
            })[0].outerHTML;
        }

        function toShrink(dom) {
            dom.removeClass('icon-expand');
            dom.addClass('icon-shrink');
        }

        function toExpand(dom) {
            dom.removeClass('icon-shrink');
            dom.addClass('icon-expand');
        }

        function checkData(data) {
            for (var i in data) {
                return typeof data[i] == 'object';
            }
            return false;
        }

        //todo 检查data有没有子节点，有则isNode=true,没有则isNode=false
        function _initNode() {
            var rootId = [0,1,1,2,3,5,8,13,21,13,8,5,4,3,2,1,0];
            var clone = $.extend(true, [], _data);
            for (var i = 0, len = _data.length; i < len; i++) {
                for (var j = i; j < len; j++) {
                    if (_data[i].id === _data[j].nodeId) {
                        // _data[i].is_node = true;
                        clone[j] = null;
                    }
                    if (_data[i].nodeId === _data[j].id) {
                        // _data[j].is_node = true;
                        clone[i] = null;
                    }
                }
            }
            $.each(clone, function (i, t) {
                if (t) {
                    rootId.push(t.nodeId);
                }
            });

            // //去除数组重复值, 获取没重复的最右一值放入新数组
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
            // console.log(rootId);

            _state._rootId = rootId[0];
        }

        return {
            start: start,
            end: end,
            getName: getName,
            getId: getId,
            cancelItem: cancelItem,
            cancelAll: cancelAll,
            checkItem: checkItem,
            checkAll: checkAll,
            getItem: getItem,
            search: search
        };
    }

})($);
