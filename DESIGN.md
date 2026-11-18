# Tally design decisions

<!-- keel:start -->
- Slice 1. Start in Transactions and keep Settings in a persistent sidebar. The browser test surface shows its mock status. The desktop shell shows that the ledger stays on the device.
- Use a single editor for add and edit. Keep amount, currency and validation messages in the editor so a failed save leaves the entered data available.
- Use a date-first table with aligned amounts and separate payee and note text. The editor and sidebar controls use native keyboard focus.
- Slice 2. Show the detected delimiter and header line next to editable mappings. Preview shows the first accepted rows and all rejected line numbers. A mapping change clears its preview before it can be committed.
- Slice 3. Place categories and payee rules beside each other where space allows. The transaction editor suggests category names, and a category delete explains the effect on existing transactions and rules.
<!-- keel:end -->
