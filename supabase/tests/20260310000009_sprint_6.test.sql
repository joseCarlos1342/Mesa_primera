BEGIN;

SELECT plan(3);

-- Test 1: Check if new columns exist
SELECT has_column('public', 'player_stats', 'games_played', 'Column games_played exists');
SELECT has_column('public', 'player_stats', 'games_won', 'Column games_won exists');

-- Test 2: Check if get_leaderboard function exists
SELECT has_function('public', 'get_leaderboard', ARRAY['text', 'text'], 'Function get_leaderboard exists');

-- For a more robust test, we would insert test data but keeping it simple for verification phase.
SELECT * FROM finish();
ROLLBACK;
