function sortByCount(arr) {
	// Sort results by count.
	var map = arr.reduce(function (p, c) {
		p[c] = (p[c] || 0) + 1;
		return p;
	}, {});
	return Object.keys(map).sort(function (a, b) {
		return map[a] < map[b];
	});
}

function reduceByCount(arr, num) {
	var map = arr.reduce(function (p, c) {
		p[c] = (p[c] || 0) + 1;
		return p;
	}, {});

	var res = [];
	for (var x in map) {
		if (map[x] >= num) res.push(x);
	}
	return res;
}

function negativeFilter(arr, neg) {
	var map = neg.reduce(function (p, c) {
		p[c] = (p[c] || 0) + 1;
		return p;
	}, {});

	var res = [];
	for (var i=0; i<arr.length; i++) {
		if (!map[arr[i]]) res.push(arr[i]);
	}
	return res;
}

Eden.Query = {};
Eden.Query.sortByCount = sortByCount;
Eden.Query.reduceByCount = reduceByCount;
Eden.Query.negativeFilter = negativeFilter;
