# Allocation Manual Test Cases

Use these cases to verify that ranking still chooses priority, while allocation treats equal or near-equal activities fairly.

## Equal Maintenance Activities

Shared setup:
- A and B are maintenance activities.
- Same importance, frequency, preferred days, last completed date, minimum, ideal, and maximum effective time.
- Minimum useful time: 50 minutes.
- Ideal time: 60 minutes.
- Maximum effective time: 90 minutes.

Expected:
- 120 minutes available: A = 60, B = 60.
- 100 minutes available: A = 50, B = 50.
- 60 minutes available: only one activity is selected for 50-60 minutes, chosen by overdue date / last completed date / daily rotation instead of list order.
- 150 minutes available: A = 75, B = 75, or another even split between ideal and maximum effective time.

## Equal Progress Activities

Setup:
- A and B are progress activities.
- Same importance and last completed date.
- Same minimum, ideal, and maximum effective time.

Expected:
- The app chooses one main progress focus instead of spreading time evenly across many progress activities.
- A second progress activity is only added when enough useful time remains and it is similarly stale, high-score, or high-importance.
- No more than two progress activities are suggested.

## Maintenance Due vs Progress

Setup:
- Maintenance activity is daily or scheduled today.
- Progress activity has similar importance but was completed recently.

Expected:
- The maintenance activity remains in the higher priority band and receives time first.
- The progress activity can still receive time if there is enough available time for a useful session.

## Not Enough Time For All Minimums

Setup:
- Multiple equal activities each need 50 minutes minimum.
- Available time is 60 minutes.

Expected:
- The app selects one meaningful 50-60 minute session.
- The chosen activity is based on overdue amount, oldest completion date, then deterministic day rotation.
- The same list order should not permanently decide the winner.

## Above Ideal But Below Max

Setup:
- Equal activities have already reached ideal time.
- Extra time remains and no unselected activity can fit its minimum useful session.

Expected:
- Extra time is distributed fairly toward maximum effective time.
- One equal activity should not receive maximum effective time while another stays at ideal.

## Batched Progress Time

Setup:
- Several progress activities exist.
- At least one maintenance activity has already received its normal allocation.
- 3-4 hours remain for progress work.

Expected:
- Remaining progress time goes mostly to the highest-ranked progress activity.
- A second progress activity may receive a useful block if it is stale/high-ranked enough.
- Progress time is not evenly split across 3-5 activities.

## Stale Progress Rotation

Setup:
- Two progress activities exist.
- One was completed yesterday.
- One has not been completed for 6 days.

Expected:
- The activity not completed for 6 days receives most or all progress time.
- After it is completed, its last completed date lowers its urgency so another progress activity can rise next time.
