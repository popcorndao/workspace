interface CardGridHeaderProps {
  title: string;
  subtitle: string;
}

const CardGridHeader: React.FC<CardGridHeaderProps> = ({
  title,
  subtitle,
}) => {
  return(
      <div className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
              {title}
            </h2>
            <p className="mt-5 text-xl text-gray-400">{subtitle}</p>
          </div>
        </div>
      </div>
  );
};
export default CardGridHeader
