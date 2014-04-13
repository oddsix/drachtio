
MOCHA_OPTS= --check-leaks --bail
REPORTER = dot

check: test

test: 
	@NODE_ENV=test ./node_modules/.bin/mocha --reporter $(REPORTER) $(MOCHA_OPTS) ./test/acceptance

.PHONY: test 
