#!/bin/bash

echo "🚀 Starting Django deployment to Heroku..."

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Make migrations
echo "🔄 Making migrations..."
python manage.py makemigrations

# Apply migrations
echo "🗄️ Applying migrations..."
python manage.py migrate

echo "✅ Django deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Make sure you have Heroku CLI installed"
echo "2. Run: heroku login"
echo "3. Run: heroku create your-app-name"
echo "4. Run: heroku addons:create heroku-postgresql:hobby-dev"
echo "5. Run: heroku config:set DJANGO_SECRET_KEY=your-secret-key"
echo "6. Run: git add . && git commit -m 'Ready for deployment'"
echo "7. Run: git push heroku main"
echo "8. Run: heroku run python manage.py migrate"
echo "9. Run: heroku open" 