Ext.define('PVE.CephCreatePool', {
    extend: 'PVE.window.Edit',
    alias: ['widget.pveCephCreatePool'],

    subject: 'Ceph Pool',
    isCreate: true,
    method: 'POST',
    items: [
	{
	    xtype: 'textfield',
	    fieldLabel: gettext('Name'),
	    name: 'name',
	    allowBlank: false
	},
	{
	    xtype: 'pveIntegerField',
	    fieldLabel: gettext('Size'),
	    name: 'size',
	    value: 3,
	    minValue: 1,
	    maxValue: 7,
	    allowBlank: false
	},
	{
	    xtype: 'pveIntegerField',
	    fieldLabel: gettext('Min. Size'),
	    name: 'min_size',
	    value: 2,
	    minValue: 1,
	    maxValue: 7,
	    allowBlank: false
	},
	{
	    xtype: 'pveIntegerField',
	    fieldLabel: 'Crush RuleSet', // do not localize
	    name: 'crush_ruleset',
	    value: 0,
	    minValue: 0,
	    maxValue: 32768,
	    allowBlank: false
	},
	{
	    xtype: 'pveIntegerField',
	    fieldLabel: 'pg_num',
	    name: 'pg_num',
	    value: 64,
	    minValue: 8,
	    maxValue: 32768,
	    allowBlank: false
	}
    ],
    initComponent : function() {
	 /*jslint confusion: true */
        var me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

        Ext.applyIf(me, {
	    url: "/nodes/" + me.nodename + "/ceph/pools"
        });

        me.callParent();
    }
});

Ext.define('PVE.node.CephPoolList', {
    extend: 'Ext.grid.GridPanel',
    alias: ['widget.pveNodeCephPoolList'],

    onlineHelp: 'chapter_pveceph',
    stateful: true,
    stateId: 'grid-ceph-pools',
    bufferedRenderer: false,
    features: [ { ftype: 'summary'} ],
    columns: [
	{
	    header: gettext('Name'),
	    width: 100,
	    sortable: true,
	    dataIndex: 'pool_name'
	},
	{
	    header: gettext('Size') + '/min',
	    width: 80,
	    sortable: false,
	    renderer: function(v, meta, rec) {
		return v + '/' + rec.data.min_size;
	    },
	    dataIndex: 'size'
	},
	{
	    header: 'pg_num',
	    width: 100,
	    sortable: false,
	    dataIndex: 'pg_num'
	},
	{
	    header: 'ruleset',
	    width: 50,
	    sortable: false,
	    dataIndex: 'crush_ruleset'
	},
	{
	    header: gettext('Used'),
	    columns: [
		{
		    header: '%',
		    width: 80,
		    sortable: true,
		    align: 'right',
		    renderer: Ext.util.Format.numberRenderer('0.00'),
		    dataIndex: 'percent_used',
		    summaryType: 'sum',
		    summaryRenderer: Ext.util.Format.numberRenderer('0.00')
		},
		{
		    header: gettext('Total'),
		    width: 100,
		    sortable: true,
		    renderer: PVE.Utils.render_size,
		    align: 'right',
		    dataIndex: 'bytes_used',
		    summaryType: 'sum',
		    summaryRenderer: PVE.Utils.render_size
		}
	    ]
	}
    ],
    initComponent: function() {
        var me = this;

	var nodename = me.pveSelNode.data.node;
	if (!nodename) {
	    throw "no node name specified";
	}

	var sm = Ext.create('Ext.selection.RowModel', {});

	var rstore = Ext.create('PVE.data.UpdateStore', {
	    interval: 3000,
	    storeid: 'ceph-pool-list' + nodename,
	    model: 'ceph-pool-list',
	    proxy: {
                type: 'pve',
                url: "/api2/json/nodes/" + nodename + "/ceph/pools"
	    }
	});

	var store = Ext.create('PVE.data.DiffStore', { rstore: rstore });

	PVE.Utils.monStoreErrors(me, rstore);

	var create_btn = new Ext.Button({
	    text: gettext('Create'),
	    handler: function() {
		var win = Ext.create('PVE.CephCreatePool', {
                    nodename: nodename
		});
		win.show();
	    }
	});

	var remove_btn = Ext.create('PVE.button.Button', {
	    text: gettext('Remove'),
	    selModel: sm,
	    disabled: true,
	    handler: function() {
		var rec = sm.getSelection()[0];

		if (!rec.data.pool_name) {
		    return;
		}
		var base_url = '/nodes/' + nodename + '/ceph/pools/' +
		    rec.data.pool_name;

		Ext.create('PVE.window.SafeDestroy', {
		    url: base_url,
		    item: { type: 'CephPool', id: rec.data.pool_name }
		}).show();
	    }
	});

	Ext.apply(me, {
	    store: store,
	    selModel: sm,
	    tbar: [ create_btn, remove_btn ],
	    listeners: {
		activate: rstore.startUpdate,
		destroy: rstore.stopUpdate
	    }
	});

	me.callParent();
    }
}, function() {

    Ext.define('ceph-pool-list', {
	extend: 'Ext.data.Model',
	fields: [ 'pool_name',
		  { name: 'pool', type: 'integer'},
		  { name: 'size', type: 'integer'},
		  { name: 'min_size', type: 'integer'},
		  { name: 'pg_num', type: 'integer'},
		  { name: 'bytes_used', type: 'integer'},
		  { name: 'percent_used', type: 'number'},
		  { name: 'crush_ruleset', type: 'integer'}
		],
	idProperty: 'pool_name'
    });
});
