
MOCHA_OPTS= --check-leaks
REPORTER = dot

check: test

test: 
	@NODE_ENV=test ./node_modules/.bin/mocha --reporter $(REPORTER) ./test/acceptance

.PHONY: test 
